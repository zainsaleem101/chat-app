function CallControls({ onToggleAudio, onToggleVideo, onEndCall, isAudioMuted, isVideoDisabled }) {
    return (
      <div className="flex justify-center space-x-4 mt-4">
        <button
          onClick={onToggleAudio}
          className={`p-3 rounded-full ${isAudioMuted ? 'bg-red-600' : 'bg-indigo-600'} hover:bg-opacity-80 transition duration-300`}
        >
          {isAudioMuted ? 'Unmute' : 'Mute'}
        </button>
        <button
          onClick={onToggleVideo}
          className={`p-3 rounded-full ${isVideoDisabled ? 'bg-red-600' : 'bg-indigo-600'} hover:bg-opacity-80 transition duration-300`}
        >
          {isVideoDisabled ? 'Turn Video On' : 'Turn Video Off'}
        </button>
        <button
          onClick={onEndCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition duration-300"
        >
          End Call
        </button>
      </div>
    );
  }
  
  export default CallControls;