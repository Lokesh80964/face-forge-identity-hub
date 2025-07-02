
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Mic, Download, Search, Settings, User, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface RegistrationData {
  id: string;
  name: string;
  created_at: string;
  face_encoding: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant specialized in face recognition data analysis. I can help you with queries about registrations, statistics, and more. Try asking me something like "Who was registered today?" or "How many people are currently registered?"',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [registrationData, setRegistrationData] = useState<RegistrationData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Load registration data
  useEffect(() => {
    fetchRegistrationData();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('face_registrations_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'face_registrations' }, 
        () => {
          fetchRegistrationData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRegistrationData = async () => {
    try {
      const { data, error } = await supabase
        .from('face_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrationData(data || []);
    } catch (error) {
      console.error('Error fetching registration data:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const processQuery = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    
    // Intent recognition and response generation
    if (lowerQuery.includes('last person') || lowerQuery.includes('most recent')) {
      if (registrationData.length === 0) {
        return 'No one has been registered yet. You can register faces using the Registration tab.';
      }
      const lastPerson = registrationData[0];
      const timeAgo = new Date(lastPerson.created_at).toLocaleString();
      return `The last person registered was **${lastPerson.name}** on ${timeAgo}.`;
    }

    if (lowerQuery.includes('how many') && (lowerQuery.includes('registered') || lowerQuery.includes('people'))) {
      const count = registrationData.length;
      return `There are currently **${count}** people registered in the system.`;
    }

    if (lowerQuery.includes('today') && lowerQuery.includes('registered')) {
      const today = new Date().toDateString();
      const todayRegistrations = registrationData.filter(person => 
        new Date(person.created_at).toDateString() === today
      );
      
      if (todayRegistrations.length === 0) {
        return 'No one was registered today.';
      }
      
      const names = todayRegistrations.map(p => p.name).join(', ');
      return `**${todayRegistrations.length}** people were registered today: ${names}`;
    }

    if (lowerQuery.includes('this week') || lowerQuery.includes('week')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weekRegistrations = registrationData.filter(person => 
        new Date(person.created_at) >= weekAgo
      );
      
      if (weekRegistrations.length === 0) {
        return 'No registrations this week.';
      }
      
      return `**${weekRegistrations.length}** people were registered this week. They are: ${weekRegistrations.map(p => p.name).join(', ')}`;
    }

    // Name-specific queries
    const nameMatch = registrationData.find(person => 
      lowerQuery.includes(person.name.toLowerCase())
    );
    
    if (nameMatch && (lowerQuery.includes('when') || lowerQuery.includes('time'))) {
      const registrationTime = new Date(nameMatch.created_at).toLocaleString();
      return `**${nameMatch.name}** was registered on ${registrationTime}.`;
    }

    if (lowerQuery.includes('all') && lowerQuery.includes('registered')) {
      if (registrationData.length === 0) {
        return 'No one is currently registered in the system.';
      }
      
      const list = registrationData.map((person, index) => 
        `${index + 1}. **${person.name}** - registered on ${new Date(person.created_at).toLocaleDateString()}`
      ).join('\n');
      
      return `Here are all registered people:\n\n${list}`;
    }

    // Statistics queries
    if (lowerQuery.includes('statistics') || lowerQuery.includes('stats')) {
      const totalCount = registrationData.length;
      const todayCount = registrationData.filter(p => 
        new Date(p.created_at).toDateString() === new Date().toDateString()
      ).length;
      
      return `**Registration Statistics:**\n\n• Total registered: ${totalCount}\n• Registered today: ${todayCount}\n• Average per day: ${(totalCount / 7).toFixed(1)} (last 7 days)`;
    }

    // Help queries
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you')) {
      return `I can help you with:\n\n• **Registration queries**: Who was registered when?\n• **Statistics**: How many people are registered?\n• **Recent activity**: What happened today/this week?\n• **Search**: Find specific people by name\n• **Data export**: Get registration lists\n\nTry asking: "Who was registered today?" or "Show me all registrations"`;
    }

    // Default response with suggestions
    return `I couldn't understand that query. Here are some things you can ask me:\n\n• "Who was the last person registered?"\n• "How many people are registered?"\n• "Show me registrations from today"\n• "When was [name] registered?"\n• "Give me registration statistics"`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: 'Analyzing your query...',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await processQuery(userMessage.content);
      
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: response, isLoading: false }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error processing your query. Please try again.', isLoading: false }
          : msg
      ));
      
      toast({
        title: "Error",
        description: "Failed to process your query",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChatHistory = () => {
    const chatData = messages.map(msg => ({
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `face-recognition-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Chat history exported successfully"
    });
  };

  const filteredMessages = messages.filter(msg => 
    searchTerm === '' || 
    msg.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quickQueries = [
    "Who was registered today?",
    "How many people are registered?",
    "Show me all registrations",
    "Give me registration statistics",
    "Who was the last person registered?"
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-b border-green-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-green-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="text-sm text-slate-300">Face Recognition Data Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 w-48"
              />
            </div>
            <Button
              onClick={exportChatHistory}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Quick Query Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {quickQueries.map((query, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(query)}
              className="px-3 py-1 text-xs bg-slate-700/30 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-full border border-slate-600/50 transition-all duration-200"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-green-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              
              <div className={`rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600/20 border border-blue-500/30'
                  : 'bg-slate-700/50 border border-slate-600/30'
              }`}>
                <div className={`text-sm ${message.isLoading ? 'animate-pulse' : ''}`}>
                  {message.content.split('\n').map((line, index) => {
                    if (line.startsWith('•')) {
                      return (
                        <div key={index} className="text-slate-300 ml-2">
                          {line}
                        </div>
                      );
                    }
                    if (line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <div key={index} className="text-slate-200">
                          {parts.map((part, i) => 
                            i % 2 === 1 ? (
                              <span key={i} className="font-semibold text-green-400">{part}</span>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={index} className="text-slate-200">
                        {line}
                      </div>
                    );
                  })}
                </div>
                
                <div className="text-xs text-slate-400 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-700/50 border border-slate-600/30 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-600/30 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about face registrations..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 resize-none min-h-[80px] focus:ring-green-500/50"
              rows={2}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="bg-green-600 hover:bg-green-700 text-white p-3"
            >
              <Send className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2"
              disabled
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>AI Ready</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
