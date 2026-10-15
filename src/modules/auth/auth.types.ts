export interface LoginDTO {
    email: string;
    password: string;
    context?: 'individual' | 'company';
  }
  export interface RegisterDTO {
    email: string;
    password: string;
    fullName: string;
    type: 'individual' | 'organization';
    organizationDetails?: {
      name: string;
      registrationNumber: string;
      type: string;
      address: string;
    };
    role: 'client' | 'contractor' | 'consultant';
    contactNumber: string;
    department?: string;
    position?: string;
    preferredCommunication?: 'email' | 'sms' | 'both';
  }