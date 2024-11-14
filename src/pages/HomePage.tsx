import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Shield, Users, Sparkles, MessagesSquare, LucideIcon } from 'lucide-react';

interface GlowingButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  onClick?: () => void;  // Add onClick prop
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const GlowingButton: React.FC<GlowingButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = "",
  onClick   // Add onClick to props
}) => (
  <button 
    onClick={onClick}  // Add onClick handler
    className={`
      px-8 py-3 rounded-xl font-medium transition-all duration-300 text-base lg:text-lg
      ${variant === 'primary' 
        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
        : 'border-2 border-purple-600 text-white hover:bg-purple-600/10'
      }
      ${className}
    `}
  >
    {children}
  </button>
);

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col h-full relative group p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300">
    <div className="flex justify-center mb-6">
      <div className="p-4 rounded-xl bg-purple-500/10">
        <Icon className="w-8 h-8 lg:w-12 lg:h-12 text-purple-400" />
      </div>
    </div>
    <h3 className="text-xl lg:text-2xl font-semibold mb-4 text-white text-center">{title}</h3>
    <p className="text-gray-400 text-center text-base lg:text-lg flex-grow">{description}</p>
  </div>
);

const StatsCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="text-center p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50">
    <div className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">{value}</div>
    <div className="text-gray-400 text-base lg:text-lg">{label}</div>
  </div>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-white flex flex-col">
      <div className="flex-grow flex flex-col">
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex flex-col justify-center max-w-[1920px]">
          {/* Hero Section */}
          <div className="text-center mb-20 lg:mb-32">
            <MessagesSquare className="w-16 h-16 lg:w-24 lg:h-24 text-purple-500 mx-auto mb-8" />
            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              NexusChat
            </h1>
            <p className="text-xl lg:text-2xl xl:text-3xl text-gray-300 mb-10 max-w-4xl mx-auto">
              Experience the future of communication with our next-generation chat platform
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <GlowingButton variant="primary" onClick={handleGetStarted}>Get Started</GlowingButton>
              <GlowingButton variant="secondary" onClick={handleGetStarted}>Learn More</GlowingButton>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20 lg:mb-32 max-w-[1400px] mx-auto w-full">
            <FeatureCard
              icon={MessageCircle}
              title="Real-time Chat"
              description="Experience instant messaging with zero latency and seamless delivery confirmation."
            />
            <FeatureCard
              icon={Shield}
              title="End-to-End Encryption"
              description="Your privacy matters. Every message is secured with military-grade encryption."
            />
            <FeatureCard
              icon={Users}
              title="Collaborative Spaces"
              description="Create dynamic group spaces for teams, friends, or communities."
            />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20 lg:mb-32 max-w-[1400px] mx-auto w-full">
            <StatsCard value="2M+" label="Active Users" />
            <StatsCard value="100M+" label="Messages Daily" />
            <StatsCard value="99.9%" label="Uptime" />
          </div>

          {/* CTA Section */}
          <div className="max-w-[1400px] mx-auto w-full px-4">
            <div className="rounded-2xl bg-gray-800/50 border border-gray-700/50 p-8 lg:p-16">
              <Sparkles className="w-12 h-12 lg:w-16 lg:h-16 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-6 text-center">
                Ready to Transform Your Communication?
              </h2>
              <p className="text-gray-300 mb-8 text-lg lg:text-xl xl:text-2xl max-w-3xl mx-auto text-center">
                Join millions of users already experiencing the future of chat. Get started for free today.
              </p>
              <div className="text-center">
                <GlowingButton variant="primary" onClick={handleGetStarted}>Join NexusChat Now</GlowingButton>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto py-8 border-t border-gray-800">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm lg:text-base">
            <p>© 2024 NexusChat. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;