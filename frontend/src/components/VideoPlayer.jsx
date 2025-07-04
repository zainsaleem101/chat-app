function VideoPlayer({ stream, muted }) {
    return (
      <div className="relative">
        <video
          ref={(video) => {
            if (video && stream) video.srcObject = stream;
          }}
          autoPlay
          muted={muted}
          className="w-full h-64 rounded-lg shadow-lg"
        />
        <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white p-2 rounded-tl-lg">
          {muted ? 'You' : 'Remote'}
        </div>
      </div>
    );
  }
  
  export default VideoPlayer;