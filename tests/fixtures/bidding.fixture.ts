import { TenderStatus, TenderType, BidStatus, TenderDocumentType } from '@/types/enums';

export const validTenderData = {
  title: 'Construction of Office Building',
  description: 'Complete construction of a 5-story office building including all MEP works',
  type: TenderType.CONSTRUCTION,
  clarificationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  submissionDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  bidOpeningDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  eligibilityCriteria: {
    minimumExperience: 5,
    minimumTurnover: 1000000,
    requiredLicenses: ['Construction License', 'Safety Certificate'],
    requiredCertifications: ['ISO 9001', 'ISO 14001'],
    geographicalRestrictions: [],
  },
  estimatedBudget: 5000000,
};

export const tenderTypes = {
  construction: TenderType.CONSTRUCTION,
  consultancy: TenderType.CONSULTANCY,
  supply: TenderType.SUPPLY,
  maintenance: TenderType.MAINTENANCE,
};

export const tenderStatuses = {
  draft: TenderStatus.DRAFT,
  published: TenderStatus.PUBLISHED,
  awarded: TenderStatus.AWARDED,
  cancelled: TenderStatus.CANCELLED,
  closed: TenderStatus.CLOSED,
};

export const bidStatuses = {
  draft: BidStatus.DRAFT,
  submitted: BidStatus.SUBMITTED,
  underEvaluation: BidStatus.UNDER_EVALUATION,
  evaluated: BidStatus.EVALUATED,
  rejected: BidStatus.REJECTED,
  awarded: BidStatus.AWARDED,
  withdrawn: BidStatus.WITHDRAWN,
};

export const tenderDocumentTypes = {
  forms: TenderDocumentType.FORMS,
  drawings: TenderDocumentType.DRAWINGS,
  boq: TenderDocumentType.BOQ,
  terms: TenderDocumentType.TERMS,
  addendum: TenderDocumentType.ADDENDUM,
  other: TenderDocumentType.OTHER,
};

export const sampleTenders = {
  openTender: {
    ...validTenderData,
    type: TenderType.CONSTRUCTION,
  },
  restrictedTender: {
    ...validTenderData,
    title: 'Specialized MEP Installation',
    type: TenderType.CONSTRUCTION,
    eligibilityCriteria: {
      ...validTenderData.eligibilityCriteria,
      minimumExperience: 10,
      requiredCertifications: ['ISO 9001', 'MEP Specialist Certification'],
    },
  },
};

export const validBidData = {
  technicalProposal: 'Comprehensive technical approach with modern construction methods...',
  proposedTimeline: 18, // months
};

export const validClarificationQuestion = {
  question: 'Could you please clarify the specifications for the HVAC system requirements?',
};

export const validClarificationAnswer = {
  response: 'The HVAC system should be a VRF system with minimum SEER rating of 18...',
};