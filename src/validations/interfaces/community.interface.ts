
interface ICommunityPostPollOption {
  option: string;
}


export interface ICommunityPostPoll {
  question: string;
  expiresAt?: Date;
  options: string[];
}

export interface ICommunityPostCreateDTO {
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string[];
  videoUrl?: string[];
  communityId?: string;
  categoryId?: string;
  pinned?: boolean;
  locked?: boolean;
  poll?: ICommunityPostPoll;
}
