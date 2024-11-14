export interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    groupId: string;
  }
  
  export interface Group {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    createdAt: Date;
    members: string[];
    inviteCode?: string;
  }
  
  export interface UserData {
    username: string;
    email: string;
    emailVerified: boolean;
  }