
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FaceRegistration from '@/components/FaceRegistration';
import LiveRecognition from '@/components/LiveRecognition';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent mb-4">
            Identity Hub
          </h1>
          <p className="text-xl text-slate-300">Advanced Face Recognition Platform</p>
        </div>

        <Tabs defaultValue="registration" className="w-full max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-800/50 border border-slate-700">
            <TabsTrigger 
              value="registration" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Registration
            </TabsTrigger>
            <TabsTrigger 
              value="recognition" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300"
            >
              Live Recognition
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-300"
            >
              Chat Interface
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registration">
            <FaceRegistration />
          </TabsContent>

          <TabsContent value="recognition">
            <LiveRecognition />
          </TabsContent>

          <TabsContent value="chat">
            <ChatInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
