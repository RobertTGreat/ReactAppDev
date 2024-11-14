import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  where,
  updateDoc,
  arrayUnion,
  startAfter
} from 'firebase/firestore';
import { 
  LogOut, 
  MessageSquare, 
  Plus,
  Hash,
  X,
  Loader2,
  Send,
  Copy,
  UserPlus
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  groupId: string;
  createdAt?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  inviteCode?: string;
}

interface UserData {
  username: string;
  email: string;
  emailVerified: boolean;
}

const formatFirestoreTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

const ChatsPage: React.FC = () => {
  const [messageListener, setMessageListener] = useState<(() => void) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [lastMessageRef, setLastMessageRef] = useState<any>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const MESSAGES_PER_PAGE = 25;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load initial user data and set up groups listener
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/auth');
          return;
        }

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();

    // Set up groups listener
    if (!auth.currentUser) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Group[];
      setGroups(groupsList);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Load messages function
  const loadMessages = async (groupId: string, lastRef?: any) => {
    try {
      let messagesQuery = query(
        collection(db, 'messages'),
        where('groupId', '==', groupId),
        orderBy('timestamp', 'desc'), // Latest messages first
        limit(MESSAGES_PER_PAGE)
      );
  
      if (lastRef) {
        messagesQuery = query(
          collection(db, 'messages'),
          where('groupId', '==', groupId),
          orderBy('timestamp', 'desc'),
          startAfter(lastRef),
          limit(MESSAGES_PER_PAGE)
        );
      }
  
      const snapshot = await getDocs(messagesQuery);
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
  
      setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
      
      if (lastRef) {
        // For loading more messages, add them to the end (they're older)
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        // For initial load, reverse to show newest at bottom
        setMessages(newMessages);
      }
  
      if (snapshot.docs.length > 0) {
        setLastMessageRef(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
    
  useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;
  
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasMoreMessages && !isLoadingMore) {
            loadMoreMessages();
          }
        },
        { threshold: 0 } // Trigger when the top of the container is visible
      );
  
      observer.observe(container);
  
      return () => observer.disconnect(); // Cleanup on unmount
    }, [hasMoreMessages, isLoadingMore]);
  

  const loadMoreMessages = async () => {
    if (!selectedGroup || !hasMoreMessages || isLoadingMore) return;
    
    setIsLoadingMore(true);
    await loadMessages(selectedGroup.id, lastMessageRef);
    setIsLoadingMore(false);
  };

  // Update group selection handler
  const handleGroupSelect = async (group: Group) => {
    setSelectedGroup(group);
    setMessages([]); // Clear existing messages
    setNewMessage('');
    setLastMessageRef(null);
    setHasMoreMessages(true);
    
    if (messageListener) {
      messageListener();
      setMessageListener(null);
    }

    try {
      // Load initial messages
      const initialQuery = query(
        collection(db, 'messages'),
        where('groupId', '==', group.id),
        orderBy('timestamp', 'desc'),
        limit(MESSAGES_PER_PAGE)
      );
  
      const snapshot = await getDocs(initialQuery);
      const initialMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
  
      setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
      setMessages(initialMessages);
  
      if (snapshot.docs.length > 0) {
        setLastMessageRef(snapshot.docs[snapshot.docs.length - 1]);
      }
  
      // Set up real-time listener for new messages
      const realtimeQuery = query(
        collection(db, 'messages'),
        where('groupId', '==', group.id),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
  
      const unsubscribe = onSnapshot(realtimeQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newMessage = {
              id: change.doc.id,
              ...change.doc.data()
            } as Message;
            
            setMessages(prev => {
              if (!prev.find(m => m.id === newMessage.id)) {
                const updatedMessages = [newMessage, ...prev];
                return updatedMessages;
              }
              return prev;
            });
          }
        });
      });
  
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading group messages:', error);
    }
  };

  // Message listener
  useEffect(() => {
    if (!selectedGroup) return;

    // Query for messages in the current group
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('groupId', '==', selectedGroup.id),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = [];
      
      snapshot.forEach((doc) => {
        newMessages.push({
          id: doc.id,
          ...doc.data() as Omit<Message, 'id'>
        });
      });

      // Sort messages by timestamp (oldest to newest)
      const sortedMessages = newMessages.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeA - timeB;
      });

      setMessages(sortedMessages);
      
      // Scroll to bottom if new message arrives
      if (sortedMessages.length > messages.length) {
        setTimeout(scrollToBottom, 100);
      }
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    // Cleanup listener on unmount or group change
    return () => unsubscribe();
  }, [selectedGroup?.id]); // Only re-run when group ID changes

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !userData || !auth.currentUser) return;

    try {
      const messageData = {
        content: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData.username,
        groupId: selectedGroup.id,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString() // Fallback timestamp
      };

      await addDoc(collection(db, 'messages'), messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle creating groups
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !auth.currentUser) return;
    
    setCreatingGroup(true);
    try {
      const newGroupData = {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        members: [auth.currentUser.uid]
      };

      const groupRef = await addDoc(collection(db, 'groups'), newGroupData);

      const newGroup: Group = {
        id: groupRef.id,
        ...newGroupData,
        createdAt: new Date(),
      };

      setGroups(prev => [newGroup, ...prev]);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedGroup(newGroup);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Handle generating invite codes
  const generateInviteCode = async () => {
    if (!selectedGroup) return;
    
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    try {
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        inviteCode: code
      });
      setInviteCode(code);
      setShowInviteModal(true);
    } catch (error) {
      console.error('Error generating invite code:', error);
    }
  };

  // Handle joining groups
  const handleJoinGroup = async (code: string) => {
    if (!code.trim() || !auth.currentUser) return;
    
    setJoining(true);
    try {
      const groupsQuery = query(
        collection(db, 'groups'),
        where('inviteCode', '==', code.trim().toUpperCase())
      );
      
      const snapshot = await getDocs(groupsQuery);
      if (snapshot.empty) {
        throw new Error('Invalid invite code');
      }

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();
      
      if (groupData.members.includes(auth.currentUser.uid)) {
        throw new Error('You are already a member of this group');
      }

      const groupRef = doc(db, 'groups', groupDoc.id);
      await updateDoc(groupRef, {
        members: arrayUnion(auth.currentUser.uid)
      });

      setShowJoinModal(false);
      setInviteCode('');

    } catch (error) {
      console.error('Error joining group:', error);
      alert(error instanceof Error ? error.message : 'Error joining group');
    } finally {
      setJoining(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1121] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

return (
    <div className="min-h-screen bg-[#0B1121] text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 flex flex-col">
        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                {userData?.username.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">@{userData?.username}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Groups</h2>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-1">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupSelect(group)}
                  className={`w-full px-2 py-1.5 rounded-lg flex items-center space-x-2 transition-colors
                    ${selectedGroup?.id === group.id 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'hover:bg-gray-800 text-gray-300'}`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="truncate">{group.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Join Group Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg
              transition-colors flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Join Group</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            {/* Group Header */}
            <header className="h-16 bg-gray-800/50 border-b border-gray-700/50 flex items-center justify-between px-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-lg font-semibold">{selectedGroup.name}</h1>
                <span className="text-sm text-gray-400">{selectedGroup.description}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={generateInviteCode}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Generate Invite Code"
                >
                  <UserPlus className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderId === auth.currentUser?.uid
                        ? 'bg-purple-500/20 text-purple-100'
                        : 'bg-gray-700/50 text-gray-100'
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                      <span className="font-medium">{message.senderName}</span>
                      <span className="opacity-60">•</span>
                      <span>{formatFirestoreTimestamp(message.timestamp)}</span>
                    </div>
                    <div className="break-words">{message.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2
                    focus:outline-none focus:border-purple-500"
                  placeholder={`Message ${selectedGroup.name}`}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Welcome to NexusChat</h3>
              <p className="text-gray-400">Select a group to start chatting!</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Group</h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2
                    focus:outline-none focus:border-purple-500"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2
                    focus:outline-none focus:border-purple-500"
                  placeholder="Enter group description"
                />
              </div>

              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim()}
                className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center space-x-2"
              >
                {creatingGroup ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Invite Code</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-3">
                <span className="flex-1 font-mono text-lg select-all">{inviteCode}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                  }}
                  className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-400">
                Share this code with others to invite them to the group.
                The code can be used multiple times.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Join Group</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                }}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2
                    focus:outline-none focus:border-purple-500 uppercase"
                  placeholder="Enter invite code"
                />
              </div>

              <button
                onClick={() => handleJoinGroup(inviteCode)}
                disabled={joining || !inviteCode.trim()}
                className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center space-x-2"
              >
                {joining ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Join Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;