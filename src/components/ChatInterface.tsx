
import React from 'react';
import { MessageCircle } from 'lucide-react';

const ChatInterface = () => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 shadow-2xl text-center">
      <div className="max-w-md mx-auto">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
        <h2 className="text-2xl font-bold text-white mb-4">Chat Interface</h2>
        <p className="text-slate-300 mb-6">
          AI-powered chat interface for interacting with the system. This will provide intelligent responses and system management capabilities.
        </p>
        <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg p-4 border border-green-500/30">
          <p className="text-green-300 text-sm">Coming Soon</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
