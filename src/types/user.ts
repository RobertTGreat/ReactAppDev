export interface User {
    uid: string;
    email: string;
    username: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date;
    verifiedAt?: Date;
  }
  
  export interface Username {
    uid: string;
  }