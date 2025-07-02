
import React from 'react';
import { Eye, Shield, Cpu } from 'lucide-react';

const AppHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-3 mb-4">
        <div className="relative">
          <Eye className="w-12 h-12 text-blue-400" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
            <Cpu className="w-2 h-2 text-slate-900" />
          </div>
        </div>
        <Shield className="w-8 h-8 text-purple-400" />
      </div>
      
      <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent mb-4">
        Identity Hub
      </h1>
      
      <p className="text-xl text-slate-300 mb-2">Advanced Face Recognition Platform</p>
      
      <div className="flex items-center justify-center space-x-6 text-sm text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>AI-Powered</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>Real-time Processing</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <span>Secure Database</span>
        </div>
      </div>
    </div>
  );
};

export default AppHeader;
