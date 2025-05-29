import { Buffer } from "node:buffer";

import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";

import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import OpenAI from "openai";
import { getAgentByName } from "agents";

type NormalizerParams = {
  posterAgentName: string;
};

async function doesUploadExist(env: Env, key: string) {
  const obj = await env.POSTERS.get(key);
  return obj !== null;
}

async function safeFileNameForPrefix(env: Env, prefix: string) {
  let fileName = `${prefix}.png`;
  let counter = 0;
  while (await doesUploadExist(env, fileName)) {
    counter++;
    fileName = `${prefix}-${counter}.png`;
  }
  return fileName;
}

const RotationInstructionsSchema = z.object({
  currentAssumedClockwiseRotation: z.enum(["0", "90", "180", "270"], {
    description:
      "If the photo is not in it's intended position, determine what clockwise rotation was made previously to get it into it's current state. Use the text in the image to help determine the rotation. Take your time to think carefully.",
  }),
  degreesToRotate: z.enum(["0", "90", "180", "270"], {
    description:
      "The amount of degrees of clockwise rotation needed to make the photo upright. Ensure the image is not upside down, the text should be right side up. Take your time in ensuring the poster is not upside down.",
  }),
});
type RotationInstructions = z.infer<typeof RotationInstructionsSchema>;

export class ImageNormalizer extends WorkflowEntrypoint<Env, NormalizerParams> {
  async run(
    event: Readonly<WorkflowEvent<NormalizerParams>>,
    step: WorkflowStep
  ): Promise<string> {
    const posterAgent = await getAgentByName(
      this.env.PosterAgent,
      event.payload.posterAgentName
    );
    const uploadedImageUrl = await posterAgent.getUploadedImageUrl();
    const slug = await posterAgent.getSlug();
    const rotationInstructions = await step.do(
      `Determine image rotation needs for ${slug}`,
      async () => {
        let imageUrl: string = uploadedImageUrl;
        if (imageUrl.startsWith("r2://uploads/")) {
          const parts = imageUrl.split("/");
          // Get .at(-1)
          const key = parts[parts.length - 1];
          const fileUpload = await this.env.UPLOADS.get(key);
          if (fileUpload === null) {
            return;
          }
          const contentType = fileUpload.httpMetadata?.contentType;
          const aBuffer = await fileUpload.arrayBuffer();
          const base64String = Buffer.from(aBuffer).toString("base64");
          imageUrl = `data:${contentType};base64,${base64String}`;
        }
        const oai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
        const response = await oai.responses.parse({
          model: "gpt-4.1",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Please help rotate the image clockwise. Use the text in the image to help determine the correct clockwise rotation. The text in the image should help because it will be right side up.`,
                },
                {
                  type: "input_image",
                  image_url: imageUrl,
                  detail: "auto",
                },
              ],
            },
          ],

          text: {
            format: zodTextFormat(
              RotationInstructionsSchema,
              "rotationInstructions"
            ),
          },
        });
        const rotationInstructions = response.output_parsed;
        console.log(
          "rotationInstructions",
          JSON.stringify(rotationInstructions)
        );
        return rotationInstructions;
      }
    );
    const transformedImageUrl = await step.do(
      "Rotate and store image",
      async () => {
        let stream: ReadableStream;
        if (uploadedImageUrl.startsWith("r2://uploads/")) {
          const parts = uploadedImageUrl.split("/");
          // Get .at(-1)
          const key = parts[parts.length - 1];
          const obj = await this.env.UPLOADS.get(key);
          stream = obj?.body as ReadableStream;
        } else {
          const response = await fetch(uploadedImageUrl);
          stream = response.body as ReadableStream;
        }
        const result = await this.env.IMAGES.input(stream)
          .transform({
            rotate: parseInt(rotationInstructions?.degreesToRotate as string),
          })
          .transform({ fit: "scale-down" })
          .transform({ width: 640 })
          .output({ format: "image/png" });
        const transformedFileName = await safeFileNameForPrefix(
          this.env,
          slug as string
        );
        await this.env.POSTERS.put(transformedFileName, result.image());
        return `r2://posters/${transformedFileName}`;
      }
    );
    const updated = await step.do("Update poster image url", async () => {
      await posterAgent.setPosterR2Url(transformedImageUrl);
    });
    return transformedImageUrl;
  }
}
