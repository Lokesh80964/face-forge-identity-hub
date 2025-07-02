
import React from 'react';
import { Scan } from 'lucide-react';

const LiveRecognition = () => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 shadow-2xl text-center">
      <div className="max-w-md mx-auto">
        <Scan className="w-16 h-16 mx-auto mb-4 text-purple-400" />
        <h2 className="text-2xl font-bold text-white mb-4">Live Recognition</h2>
        <p className="text-slate-300 mb-6">
          Real-time face recognition feature will be implemented here. This will allow you to identify registered faces in live video streams.
        </p>
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-4 border border-purple-500/30">
          <p className="text-purple-300 text-sm">Coming Soon</p>
        </div>
      </div>
    </div>
  );
};

export default LiveRecognition;
