
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FaceRegistration from '@/components/FaceRegistration';
import LiveRecognition from '@/components/LiveRecognition';
import ChatInterface from '@/components/ChatInterface';
import AppHeader from '@/components/AppHeader';
import NavigationBreadcrumbs from '@/components/NavigationBreadcrumbs';

const Index = () => {
  const [currentTab, setCurrentTab] = useState('registration');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setCurrentTab('registration');
            break;
          case '2':
            e.preventDefault();
            setCurrentTab('recognition');
            break;
          case '3':
            e.preventDefault();
            setCurrentTab('chat');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <AppHeader />
        
        <NavigationBreadcrumbs currentTab={currentTab} />

        <Tabs 
          value={currentTab} 
          onValueChange={setCurrentTab}
          className="w-full max-w-6xl mx-auto"
        >
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-800/50 border border-slate-700">
            <TabsTrigger 
              value="registration" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 relative"
            >
              Face Registration
              <span className="hidden lg:inline text-xs text-slate-400 ml-2">(Ctrl+1)</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recognition" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 relative"
            >
              Live Recognition
              <span className="hidden lg:inline text-xs text-slate-400 ml-2">(Ctrl+2)</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-300 relative"
            >
              AI Assistant
              <span className="hidden lg:inline text-xs text-slate-400 ml-2">(Ctrl+3)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registration" className="focus:outline-none">
            <FaceRegistration />
          </TabsContent>

          <TabsContent value="recognition" className="focus:outline-none">
            <LiveRecognition />
          </TabsContent>

          <TabsContent value="chat" className="focus:outline-none">
            <ChatInterface />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>© 2024 Identity Hub - Advanced Face Recognition Platform</p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <span>Powered by AI & Machine Learning</span>
            <span>•</span>
            <span>Secure & Privacy-Focused</span>
            <span>•</span>
            <span>Real-time Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
