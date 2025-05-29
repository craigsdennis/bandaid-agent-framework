import { useAgent } from "agents/react";
import { useState } from "react";
import type { OrchestratorState, PosterSummary } from "./agents/orchestrator";
import Layout from "./front-end/Layout";
import PhotoUpload from "./front-end/components/photo-upload";

type UploadState = {
  isUploading: boolean;
  progress: string;
  currentStep: string;
};

export default function App() {
  const [result, setResult] = useState<string>("");
  const [posters, setPosters] = useState<PosterSummary[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: "",
    currentStep: ""
  });

  const agent = useAgent({
    agent: "orchestrator",
    name: "main",
    onOpen(event) {
      console.log("Agent opening");
    },
    onMessage: (message) => {
      console.log("Message received");
      setResult(message.data);
    },
    onStateUpdate: (state: OrchestratorState, source) => {
      console.log("State updated");
      setPosters(state.posters);
    },
  });

  const addPoster = async (url: string) => {
    setUploadState({
      isUploading: true,
      progress: "0%",
      currentStep: "Submitting poster to analysis..."
    });

    try {
      setUploadState(prev => ({
        ...prev,
        progress: "25%",
        currentStep: "Processing image..."
      }));

      await agent.call("submitPoster", [url]);

      setUploadState(prev => ({
        ...prev,
        progress: "75%",
        currentStep: "Analyzing bands and artists..."
      }));

      // Wait a bit for the orchestrator to process
      setTimeout(() => {
        setUploadState({
          isUploading: false,
          progress: "100%",
          currentStep: "Complete! Check your posters below."
        });
        
        // Clear success message after a few seconds
        setTimeout(() => {
          setUploadState({
            isUploading: false,
            progress: "",
            currentStep: ""
          });
        }, 3000);
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState({
        isUploading: false,
        progress: "",
        currentStep: "Upload failed. Please try again."
      });
      
      // Clear error message after a few seconds
      setTimeout(() => {
        setUploadState({
          isUploading: false,
          progress: "",
          currentStep: ""
        });
      }, 3000);
    }
  };

  const debugOrchestratorState = (e: React.FormEvent) => {
    e.preventDefault();
    agent.send(JSON.stringify({ event: "state.debug" }));
  };
  const deleteAllPosters = async (e: React.FormEvent) => {
    e.preventDefault();
    await agent.call("deleteAllPosters");
  };

  return (
    <Layout>
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-black uppercase tracking-widest text-center text-yellow-400 transform -rotate-2 drop-shadow-[6px_6px_0px_#dc2626] hover:drop-shadow-[8px_8px_0px_#dc2626] transition-all duration-300">
            🎸 BandAid 🎤
          </h1>
          <p className="text-xl text-stone-300 max-w-2xl mx-auto leading-relaxed font-mono">
            Upload concert posters and discover the bands playing. We'll analyze the poster, find the artists on Spotify, and create custom playlists for you!
          </p>
        </div>

        {/* Upload Section */}
        <PhotoUpload onUrlSubmit={addPoster} uploadState={uploadState} />

        {/* Posters Gallery */}
        {posters.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black uppercase text-yellow-400 text-center tracking-wide border-b-4 border-yellow-400 inline-block pb-2 mx-auto">
              🎪 Your Concert Posters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posters.map((poster, index) => (
                <div key={poster.slug} className="group">
                  <a href={`/posters/${poster.id}`} className="block">
                    <div className={`bg-black/40 border-4 border-stone-600 hover:border-red-500 p-4 transform ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'} hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-[4px_4px_0px_rgba(0,0,0,0.6)] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)]`}>
                      <img 
                        src={poster.imageUrl} 
                        alt={`Concert poster ${poster.slug}`}
                        className="w-full border-2 border-white shadow-lg mb-3"
                      />
                      <div className="text-center">
                        <span className="text-red-400 font-bold text-lg uppercase tracking-wide group-hover:text-yellow-400 transition-colors duration-300">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Section */}
        <div className="bg-stone-900/80 border-2 border-stone-600 p-6 transform rotate-1">
          <details className="space-y-4">
            <summary className="text-2xl font-black uppercase text-stone-400 cursor-pointer hover:text-red-400 transition-colors duration-300 tracking-wide">
              ⚙️ Admin Controls (Click to expand)
            </summary>
            
            <div className="space-y-4 pt-4">
              <p className="text-stone-400 font-mono">
                Don't forget to check out the console, nerd 🤓
              </p>
              
              {result && (
                <div className="bg-black/50 border-l-4 border-green-400 p-3">
                  <span className="text-green-400 font-bold">Latest message:</span>
                  <code className="text-yellow-400 ml-2 font-mono">{result}</code>
                </div>
              )}
              
              <form className="flex flex-wrap gap-4">
                <button 
                  onClick={debugOrchestratorState}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wide px-6 py-3 transform skew-x-1 shadow-[3px_3px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border border-white"
                >
                  🔍 Debug State
                </button>
                <button 
                  onClick={deleteAllPosters}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wide px-6 py-3 transform -skew-x-1 shadow-[3px_3px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border border-white"
                >
                  🗑️ Delete All Posters
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </Layout>
  );
}
