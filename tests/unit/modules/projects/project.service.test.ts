import { projectService } from '@/modules/projects/project.service';
import { Project } from '@/modules/projects/project.model';
// import { User } from '@/modules/users/user.model';
// import { Budget } from '@/modules/finance/models/budget.model';
import { Expense } from '@/modules/finance/models/expense.model';
import { GRN } from '@/modules/finance/models/grn.model';
// import { Invoice } from '@/modules/finance/models/invoice.model';
import { PurchaseOrder } from '@/modules/procurement/purchaseOrder.model';
// import { ProgressTracking } from '@/modules/timeline/timeline.model';
import { Upload } from '@/modules/file/upload.model';
import { createTestUser } from '../../../helpers/auth.helper';
import {
  seedTestGRN,
  seedTestProject, seedTestPurchaseOrder,
  // seedTestBudget,
  // seedTestExpense
} from '../../../helpers/db.helper';
import { 
  validProjectData, 
  // sampleProjects,
  // invalidProjectData,
  // createProjectWithTeam
} from '../../../fixtures/projects.fixture';
import { 
  ProjectStatus, 
  ProjectType, 
  UserRole, 
  DocumentStatus,
  ExpenseCategory 
} from '@/types/enums';
import mongoose from 'mongoose';
import {GRNStatus, PaymentTerms} from "../../../../src/types/enums";

describe('ProjectService', () => {
  let testUser: any;
  let testUserId: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    testUserId = testUser._id.toString();
  });

  // ==========================================
  // CREATE PROJECT TESTS
  // ==========================================
  describe('createProject', () => {
    it('should create a project successfully with valid data', async () => {
      const projectData = {
        name: 'New Construction Project',
        projectDescription: 'A comprehensive construction project',
        status: ProjectStatus.PLANNING,
        type: ProjectType.CAPITAL,
        budget: 500000,
      };

      const project = await projectService.createProject(projectData, testUserId);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.projectDescription).toBe(projectData.projectDescription);
      expect(project.status).toBe(ProjectStatus.PLANNING);
      expect(project.type).toBe(ProjectType.CAPITAL);
      expect(project.budget).toBe(500000);
      expect(project.createdBy.toString()).toBe(testUserId);
      expect(project.updatedBy.toString()).toBe(testUserId);
      expect(project.projectCode).toMatch(/^PROJ-/);
    });

    it('should auto-assign creator as Owner in team if no team provided', async () => {
      const projectData = {
        name: 'Solo Project',
        projectDescription: 'Project without explicit team',
        status: ProjectStatus.PLANNING,
        type: ProjectType.MAINTENANCE,
        budget: 100000,
      };

      const project = await projectService.createProject(projectData, testUserId);

      expect(project.team).toHaveLength(1);
      expect(project.team[0].user.toString()).toBe(testUserId);
      expect(project.team[0].role).toBe(UserRole.OWNER);
    });

    it('should create project with provided team members', async () => {
      const teamMember = await createTestUser({email: 'engineer@test.com'});

      const projectData = {
        name: 'Team Project',
        projectDescription: 'Project with team members',
        status: ProjectStatus.PLANNING,
        type: ProjectType.CAPITAL,
        budget: 200000,
        team: [
          {user: new mongoose.Types.ObjectId(testUserId), role: UserRole.OWNER},
          {user: teamMember._id, role: UserRole.SITE_ENGINEER},
        ],
      };

      const project = await projectService.createProject(projectData, testUserId);

      expect(project.team).toHaveLength(2);
      expect(project.team.some(m => m.role === UserRole.OWNER)).toBe(true);
      expect(project.team.some(m => m.role === UserRole.SITE_ENGINEER)).toBe(true);
    });

    it('should generate unique project code', async () => {
      const projectData1 = {...validProjectData, name: 'Project 1'};
      const projectData2 = {...validProjectData, name: 'Project 2'};

      const project1 = await projectService.createProject(projectData1, testUserId);
      const project2 = await projectService.createProject(projectData2, testUserId);

      expect(project1.projectCode).not.toBe(project2.projectCode);
    });

    it('should throw error for invalid user ID format', async () => {
      const projectData = {...validProjectData};

      await expect(
          projectService.createProject(projectData, 'invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should create project with default progress of 0', async () => {
      const projectData = {
        name: 'New Project',
        projectDescription: 'Description for new project',
        status: ProjectStatus.PLANNING,
        type: ProjectType.CAPITAL,
        budget: 100000,
      };

      const project = await projectService.createProject(projectData, testUserId);

      expect(project.progress).toBe(0);
    });

    it('should create project with empty documents array', async () => {
      const projectData = {...validProjectData};

      const project = await projectService.createProject(projectData, testUserId);

      expect(project.documents).toEqual([]);
    });
  });

  // ==========================================
  // GET PROJECT BY ID TESTS
  // ==========================================
  describe('getProjectById', () => {
    it('should return project when found', async () => {
      const project = await seedTestProject(testUserId);

      const result = await projectService.getProjectById(project._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(project._id.toString());
      expect(result.name).toBe(project.name);
    });

    it('should populate team user details', async () => {
      const project = await seedTestProject(testUserId);

      const result = await projectService.getProjectById(project._id.toString());

      expect(result.team).toBeDefined();
      expect(result.team.length).toBeGreaterThan(0);
      // Check if user is populated with expected fields
      if (result.team[0].user && typeof result.team[0].user === 'object') {
        expect(result.team[0].user).toHaveProperty('fullName');
        expect(result.team[0].user).toHaveProperty('email');
      }
    });

    it('should throw NOT_FOUND error when project does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
          projectService.getProjectById(fakeId)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for invalid ObjectId format', async () => {
      await expect(
          projectService.getProjectById('invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should throw error for empty string ID', async () => {
      await expect(
          projectService.getProjectById('')
      ).rejects.toThrow('Invalid project ID format');
    });
  });

  // ==========================================
  // GET ALL PROJECTS TESTS
  // ==========================================
  describe('getAllProjects', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await projectService.getAllProjects();

      expect(projects).toEqual([]);
    });

    it('should return all projects', async () => {
      await seedTestProject(testUserId, {name: 'Project 1'});
      await seedTestProject(testUserId, {name: 'Project 2'});
      await seedTestProject(testUserId, {name: 'Project 3'});

      const projects = await projectService.getAllProjects();

      expect(projects).toHaveLength(3);
    });

    it('should populate team user details for all projects', async () => {
      await seedTestProject(testUserId);

      const projects = await projectService.getAllProjects();

      expect(projects[0].team).toBeDefined();
    });
  });

  // ==========================================
  // GET PROJECTS BY USER ID TESTS
  // ==========================================
  describe('getProjectsByUserId', () => {
    it('should return projects created by user', async () => {
      await seedTestProject(testUserId, {name: 'User Project 1'});
      await seedTestProject(testUserId, {name: 'User Project 2'});

      const projects = await projectService.getProjectsByUserId(testUserId);

      expect(projects).toHaveLength(2);
    });

    it('should return projects where user is team member', async () => {
      const owner = await createTestUser({email: 'owner@test.com'});

      const project = new Project({
        name: 'Team Member Project',
        projectDescription: 'Project where test user is team member',
        status: ProjectStatus.PLANNING,
        type: ProjectType.CAPITAL,
        budget: 100000,
        createdBy: owner._id,
        updatedBy: owner._id,
        team: [
          {user: owner._id, role: UserRole.OWNER},
          {user: testUser._id, role: UserRole.SITE_ENGINEER},
        ],
      });
      await project.save();

      const projects = await projectService.getProjectsByUserId(testUserId);

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Team Member Project');
    });

    it('should return only individual projects when individualOnly is true', async () => {
      // Create individual project (no companyId)
      await seedTestProject(testUserId, {name: 'Individual Project'});

      // Create company project
      const companyId = new mongoose.Types.ObjectId();
      await seedTestProject(testUserId, {
        name: 'Company Project',
        companyId: companyId
      });

      const projects = await projectService.getProjectsByUserId(testUserId, true);

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Individual Project');
    });

    it('should return all projects when individualOnly is false', async () => {
      await seedTestProject(testUserId, {name: 'Individual Project'});

      const companyId = new mongoose.Types.ObjectId();
      await seedTestProject(testUserId, {
        name: 'Company Project',
        companyId: companyId
      });

      const projects = await projectService.getProjectsByUserId(testUserId, false);

      expect(projects).toHaveLength(2);
    });

    it('should return empty array for user with no projects', async () => {
      const newUser = await createTestUser({email: 'noproject@test.com'});

      const projects = await projectService.getProjectsByUserId(newUser._id.toString());

      expect(projects).toEqual([]);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
          projectService.getProjectsByUserId('invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });
  });

  // ==========================================
  // GET PROJECTS BY USER ID AND COMPANY TESTS
  // ==========================================
  describe('getProjectsByUserIdAndCompany', () => {
    it('should return projects for user in specific company', async () => {
      const companyId = new mongoose.Types.ObjectId();

      await seedTestProject(testUserId, {
        name: 'Company Project',
        companyId: companyId
      });

      // Create project in different company
      const otherCompanyId = new mongoose.Types.ObjectId();
      await seedTestProject(testUserId, {
        name: 'Other Company Project',
        companyId: otherCompanyId
      });

      const projects = await projectService.getProjectsByUserIdAndCompany(
          testUserId,
          companyId.toString()
      );

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Company Project');
    });

    it('should return empty array when no projects in company', async () => {
      const companyId = new mongoose.Types.ObjectId();

      const projects = await projectService.getProjectsByUserIdAndCompany(
          testUserId,
          companyId.toString()
      );

      expect(projects).toEqual([]);
    });

    it('should throw error for invalid user ID', async () => {
      const companyId = new mongoose.Types.ObjectId().toString();

      await expect(
          projectService.getProjectsByUserIdAndCompany('invalid-id', companyId)
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should throw error for invalid company ID', async () => {
      await expect(
          projectService.getProjectsByUserIdAndCompany(testUserId, 'invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });
  });

  // ==========================================
  // UPDATE PROJECT TESTS
  // ==========================================
  describe('updateProject', () => {
    it('should update project name successfully', async () => {
      const project = await seedTestProject(testUserId);

      const updated = await projectService.updateProject(
          project._id.toString(),
          {name: 'Updated Project Name'},
          testUserId
      );

      expect(updated.name).toBe('Updated Project Name');
    });

    it('should update project status', async () => {
      const project = await seedTestProject(testUserId, {
        status: ProjectStatus.PLANNING
      });

      const updated = await projectService.updateProject(
          project._id.toString(),
          {status: ProjectStatus.IN_PROGRESS},
          testUserId
      );

      expect(updated.status).toBe(ProjectStatus.IN_PROGRESS);
    });

    it('should update project progress', async () => {
      const project = await seedTestProject(testUserId);

      const updated = await projectService.updateProject(
          project._id.toString(),
          {progress: 50},
          testUserId
      );

      expect(updated.progress).toBe(50);
    });

    it('should update project budget', async () => {
      const project = await seedTestProject(testUserId, {budget: 100000});

      const updated = await projectService.updateProject(
          project._id.toString(),
          {budget: 150000},
          testUserId
      );

      expect(updated.budget).toBe(150000);
    });

    it('should update project team', async () => {
      const project = await seedTestProject(testUserId);
      const newMember = await createTestUser({email: 'newmember@test.com'});

      const updated = await projectService.updateProject(
          project._id.toString(),
          {
            team: [
              {user: new mongoose.Types.ObjectId(testUserId), role: UserRole.OWNER},
              {user: new mongoose.Types.ObjectId(newMember._id.toString()), role: UserRole.FINANCE_OFFICER},
            ]
          },
          testUserId
      );

      expect(updated.team).toHaveLength(2);
    });

    it('should set updatedBy to the user making the update', async () => {
      const project = await seedTestProject(testUserId);
      const updater = await createTestUser({email: 'updater@test.com'});

      const updated = await projectService.updateProject(
          project._id.toString(),
          {name: 'Updated by different user'},
          updater._id.toString()
      );

      expect(updated.updatedBy.toString()).toBe(updater._id.toString());
    });

    it('should throw NOT_FOUND for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
          projectService.updateProject(fakeId, {name: 'New Name'}, testUserId)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for invalid project ID', async () => {
      await expect(
          projectService.updateProject('invalid-id', {name: 'New Name'}, testUserId)
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should throw error for invalid user ID', async () => {
      const project = await seedTestProject(testUserId);

      await expect(
          projectService.updateProject(project._id.toString(), {name: 'New Name'}, 'invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should handle partial updates without affecting other fields', async () => {
      const project = await seedTestProject(testUserId, {
        name: 'Original Name',
        projectDescription: 'Original Description',
        budget: 100000,
      });

      const updated = await projectService.updateProject(
          project._id.toString(),
          {name: 'New Name Only'},
          testUserId
      );

      expect(updated.name).toBe('New Name Only');
      expect(updated.projectDescription).toBe('Original Description');
      expect(updated.budget).toBe(100000);
    });

    it('should populate team user details after update', async () => {
      const project = await seedTestProject(testUserId);

      const updated = await projectService.updateProject(
          project._id.toString(),
          {progress: 25},
          testUserId
      );

      expect(updated.team).toBeDefined();
    });
  });

  // ==========================================
  // DELETE PROJECT TESTS
  // ==========================================
  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const project = await seedTestProject(testUserId);

      await projectService.deleteProject(project._id.toString());

      const found = await Project.findById(project._id);
      expect(found).toBeNull();
    });

    it('should throw NOT_FOUND for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
          projectService.deleteProject(fakeId)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for invalid project ID', async () => {
      await expect(
          projectService.deleteProject('invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });
  });

  // ==========================================
  // GET PROJECT MEMBERS TESTS
  // ==========================================
  describe('getProjectMembers', () => {
    it('should return all project members with details', async () => {
      const member1 = await createTestUser({
        email: 'member1@test.com',
        fullName: 'Member One'
      });
      const member2 = await createTestUser({
        email: 'member2@test.com',
        fullName: 'Member Two'
      });

      const project = new Project({
        name: 'Team Project',
        projectDescription: 'Project with multiple members',
        status: ProjectStatus.PLANNING,
        type: ProjectType.CAPITAL,
        budget: 100000,
        createdBy: testUser._id,
        updatedBy: testUser._id,
        team: [
          {user: testUser._id, role: UserRole.OWNER},
          {user: member1._id, role: UserRole.PROJECT_MANAGER},
          {user: member2._id, role: UserRole.SITE_ENGINEER},
        ],
      });
      await project.save();

      const members = await projectService.getProjectMembers(project._id.toString());

      expect(members).toHaveLength(3);
      expect(members.some(m => m.role === UserRole.OWNER)).toBe(true);
      expect(members.some(m => m.role === UserRole.PROJECT_MANAGER)).toBe(true);
      expect(members.some(m => m.role === UserRole.SITE_ENGINEER)).toBe(true);
    });

    it('should return member details including fullName and email', async () => {
      const project = await seedTestProject(testUserId);

      const members = await projectService.getProjectMembers(project._id.toString());

      expect(members[0]).toHaveProperty('userId');
      expect(members[0]).toHaveProperty('role');
      expect(members[0]).toHaveProperty('fullName');
      expect(members[0]).toHaveProperty('email');
    });

    it('should throw NOT_FOUND for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
          projectService.getProjectMembers(fakeId)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for invalid project ID', async () => {
      await expect(
          projectService.getProjectMembers('invalid-id')
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should return empty team array for project with no team', async () => {
      // Directly create project without team for edge case
      const project = new Project({
        name: 'No Team Project',
        projectDescription: 'Project without team members',
        status: ProjectStatus.PLANNING,
        type: ProjectType.CAPITAL,
        budget: 100000,
        createdBy: testUser._id,
        updatedBy: testUser._id,
        team: [],
      });
      await project.save();

      const members = await projectService.getProjectMembers(project._id.toString());

      expect(members).toEqual([]);
    });
  });

  // ==========================================
  // GET PROJECT DOCUMENTS TESTS
  // ==========================================
    describe('getProjectDocuments', () => {
    let project: any;

    beforeEach(async () => {
      project = await seedTestProject(testUserId);
    });

    it('should return empty array when no documents exist', async () => {
      const documents = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.OWNER,
          {}
      );

      expect(documents).toEqual([]);
    });

    it('should return project documents for Owner role', async () => {
      // Add document to project
      project.documents.push({
        filePath: '/uploads/test-doc.pdf',
        description: 'Test Document',
      });
      await project.save();

      // Create corresponding Upload record
      await Upload.create({
        userId: testUser._id,
        filePath: '/uploads/test-doc.pdf',
        fileName: 'test-doc.pdf',
        fileType: 'application/pdf',
        fileSize: 1234,
        description: 'Test Document',
        status: DocumentStatus.APPROVED,
      });

      const documents = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.OWNER,
          {}
      );

      expect(documents.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter documents by type', async () => {
      const documents = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.OWNER,
          {type: 'project'}
      );

      expect(Array.isArray(documents)).toBe(true);
    });

    it('should filter documents by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const documents = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.OWNER,
          {startDate, endDate}
      );

      expect(Array.isArray(documents)).toBe(true);
    });

    it('should filter documents by status', async () => {
      const documents = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.OWNER,
          {status: DocumentStatus.APPROVED}
      );

      expect(Array.isArray(documents)).toBe(true);
    });

    it('should throw error for invalid project ID', async () => {
      await expect(
          projectService.getProjectDocuments('invalid-id', UserRole.OWNER, {})
      ).rejects.toThrow('Invalid project ID format');
    });

    it('should respect role-based document access for financial documents', async () => {
      // Create expense with document
      await Expense.create({
        projectId: project._id,
        date: new Date(),
        category: ExpenseCategory.MATERIALS,
        amount: 5000,
        description: 'Test expense',
        documents: [{filePath: '/uploads/expense.pdf', description: 'Receipt'}],
        createdBy: testUser._id,
        updatedBy: testUser._id,
      });

      // Finance officer should have access
      const financeDocuments = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.FINANCE_OFFICER,
          {}
      );

      expect(Array.isArray(financeDocuments)).toBe(true);
    });

    it('should include GRN documents for procurement roles', async () => {
      // First create a PO, then a GRN
      const po = await seedTestPurchaseOrder(
          project._id.toString(),
          testUser._id.toString()
      );

      // Create GRN with documents
      await seedTestGRN(
          project._id.toString(),
          po._id.toString(),
          testUser._id.toString(),
          {
            documents: [
              {filePath: 'uploads/grn-doc.pdf', description: 'GRN Document'}
            ],
            status: GRNStatus.PARTIAL,
          }
      );

      const documents = await projectService.getProjectDocuments(
          project._id.toString(),
          UserRole.PROCUREMENT_OFFICER,
          {type: 'grn'}
      );

      expect(documents).toBeDefined();
    });
  });

  // ==========================================
  // REVIEW DOCUMENT TESTS
  // ==========================================
  describe('reviewDocument', () => {
    let project: any;
    let uploadDoc: any;

    beforeEach(async () => {
      project = await seedTestProject(testUserId);

      uploadDoc = await Upload.create({
        userId: testUser._id,
        filePath: '/uploads/review-test.pdf',
        fileName: 'review-test.pdf',
        fileType: 'application/pdf',
        fileSize: 1234,
        description: 'Document to review',
        status: DocumentStatus.PENDING,
      });
    });

    it('should approve a document successfully', async () => {
      await projectService.reviewDocument(
          uploadDoc._id.toString(),
          DocumentStatus.APPROVED,
          'Looks good!',
          testUserId
      );

      const updated = await Upload.findById(uploadDoc._id);
      expect(updated?.status).toBe(DocumentStatus.APPROVED);
      expect(updated?.reviewComments).toBe('Looks good!');
      expect(updated?.reviewedBy?.toString()).toBe(testUserId);
      expect(updated?.reviewedAt).toBeDefined();
    });

    it('should reject a document with comments', async () => {
      // Add document reference to project
      project.documents.push({
        filePath: uploadDoc.filePath,
        description: 'Test doc',
      });
      await project.save();

      await projectService.reviewDocument(
          uploadDoc._id.toString(),
          DocumentStatus.REJECTED,
          'Please resubmit with corrections',
          testUserId
      );

      const updated = await Upload.findById(uploadDoc._id);
      expect(updated?.status).toBe(DocumentStatus.REJECTED);
      expect(updated?.reviewComments).toBe('Please resubmit with corrections');
    });

    it('should throw NOT_FOUND for non-existent document', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
          projectService.reviewDocument(
              fakeId,
              DocumentStatus.APPROVED,
              'Comment',
              testUserId
          )
      ).rejects.toThrow('Document not found');
    });

    it('should throw error for invalid document ID', async () => {
      await expect(
          projectService.reviewDocument(
              'invalid-id',
              DocumentStatus.APPROVED,
              'Comment',
              testUserId
          )
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // DELETE PROJECT DOCUMENT TESTS
  // ==========================================
  describe('deleteProjectDocument', () => {
    let project: any;

    beforeEach(async () => {
      project = await seedTestProject(testUserId);
    });

    it('should delete a project document', async () => {
      project.documents.push({
        filePath: '/uploads/to-delete.pdf',
        description: 'Document to delete',
      });
      await project.save();

      await projectService.deleteProjectDocument(
          project._id.toString(),
          project._id.toString(),
          'project',
          '/uploads/to-delete.pdf'
      );

      const updated = await Project.findById(project._id);
      expect(updated?.documents.find(d => d.filePath === '/uploads/to-delete.pdf')).toBeUndefined();
    });

    it('should handle GRN document deletion', async () => {
      const grn = await GRN.create({
        projectId: project._id,
        purchaseOrderId: new mongoose.Types.ObjectId(),
        grnNumber: 'GRN-DEL-001',
        receivedDate: new Date(),
        status: GRNStatus.PARTIAL,
        receivedBy: 'Receiver',
        items: [],
        documents: [{filePath: '/uploads/grn-delete.pdf', description: 'GRN'}],
        createdBy: testUser._id,
        updatedBy: testUser._id,
      });

      await projectService.deleteProjectDocument(
          project._id.toString(),
          grn._id.toString(),
          'grn',
          '/uploads/grn-delete.pdf'
      );

      const updated = await GRN.findById(grn._id);
      expect(updated?.documents.find(d => d.filePath === '/uploads/grn-delete.pdf')).toBeUndefined();
    });

    it('should handle PO document deletion', async () => {
      const po = await PurchaseOrder.create({
        projectId: project._id,
        poNumber: 'PO-DEL-001',
        supplierDetails: 'Supplier - Contact: 123456 - Email: supplier@test.com - Address: 123 Test St',
        materialList: [],
        totalCost: 1000,
        deliveryDate: new Date(),
        paymentTerms: PaymentTerms.NET_30,
        documentFilePath: '/uploads/po-delete.pdf',
        createdBy: testUser._id,
        updatedBy: testUser._id,
      });

      await projectService.deleteProjectDocument(
          project._id.toString(),
          po._id.toString(),
          'po',
          '/uploads/po-delete.pdf'
      );

      const updated = await PurchaseOrder.findById(po._id);
      expect(updated?.documentFilePath).toBeUndefined();
    });

    it('should throw error for invalid document type', async () => {
      await expect(
          projectService.deleteProjectDocument(
              project._id.toString(),
              project._id.toString(),
              'invalid-type',
              '/uploads/test.pdf'
          )
      ).rejects.toThrow('Invalid document type provided');
    });
  });

    // ==========================================
    // EDGE CASES AND ERROR HANDLING
    // ==========================================
    describe('Edge Cases', () => {
      it('should handle project with maximum progress value', async () => {
        const project = await seedTestProject(testUserId);

        const updated = await projectService.updateProject(
            project._id.toString(),
            {progress: 100},
            testUserId
        );

        expect(updated.progress).toBe(100);
      });

      it('should handle project with zero budget', async () => {
        const projectData = {
          ...validProjectData,
          budget: 0,
        };

        const project = await projectService.createProject(projectData, testUserId);

        expect(project.budget).toBe(0);
      });

      it('should handle concurrent project updates', async () => {
        const project = await seedTestProject(testUserId);

        const [update1, update2] = await Promise.all([
          projectService.updateProject(
              project._id.toString(),
              {name: 'Update 1'},
              testUserId
          ),
          projectService.updateProject(
              project._id.toString(),
              {progress: 50},
              testUserId
          ),
        ]);

        // Both updates should complete
        expect(update1).toBeDefined();
        expect(update2).toBeDefined();
      });

      it('should handle project with special characters in name', async () => {
        const projectData = {
          ...validProjectData,
          name: 'Project & Test <Special> "Characters"',
        };

        const project = await projectService.createProject(projectData, testUserId);

        expect(project.name).toBe('Project & Test <Special> "Characters"');
      });

      it('should handle project with unicode characters', async () => {
        const projectData = {
          ...validProjectData,
          name: 'مشروع اختبار - プロジェクト',
          projectDescription: '这是一个测试项目描述 🏗️',
        };

        const project = await projectService.createProject(projectData, testUserId);

        expect(project.name).toBe('مشروع اختبار - プロジェクト');
      });

      it('should handle very long project description', async () => {
        const longDescription = 'A'.repeat(5000);
        const projectData = {
          ...validProjectData,
          projectDescription: longDescription,
        };

        const project = await projectService.createProject(projectData, testUserId);

        expect(project.projectDescription).toBe(longDescription);
      });
    });

    // ==========================================
    // PROJECT STATUS TRANSITIONS
    // ==========================================
    describe('Project Status Transitions', () => {
      it('should allow transition from PLANNING to IN_PROGRESS', async () => {
        const project = await seedTestProject(testUserId, {
          status: ProjectStatus.PLANNING
        });

        const updated = await projectService.updateProject(
            project._id.toString(),
            {status: ProjectStatus.IN_PROGRESS},
            testUserId
        );

        expect(updated.status).toBe(ProjectStatus.IN_PROGRESS);
      });

      it('should allow transition from IN_PROGRESS to ON_HOLD', async () => {
        const project = await seedTestProject(testUserId, {
          status: ProjectStatus.IN_PROGRESS
        });

        const updated = await projectService.updateProject(
            project._id.toString(),
            {status: ProjectStatus.ON_HOLD},
            testUserId
        );

        expect(updated.status).toBe(ProjectStatus.ON_HOLD);
      });

      it('should allow transition from IN_PROGRESS to COMPLETED', async () => {
        const project = await seedTestProject(testUserId, {
          status: ProjectStatus.IN_PROGRESS
        });

        const updated = await projectService.updateProject(
            project._id.toString(),
            {status: ProjectStatus.COMPLETED},
            testUserId
        );

        expect(updated.status).toBe(ProjectStatus.COMPLETED);
      });

      it('should allow transition to CANCELLED from any status', async () => {
        const project = await seedTestProject(testUserId, {
          status: ProjectStatus.IN_PROGRESS
        });

        const updated = await projectService.updateProject(
            project._id.toString(),
            {status: ProjectStatus.CANCELLED},
            testUserId
        );

        expect(updated.status).toBe(ProjectStatus.CANCELLED);
      });
    });

    // ==========================================
    // PROJECT TYPE SPECIFIC TESTS
    // ==========================================
    describe('Project Types', () => {
      it('should create CAPITAL project type', async () => {
        const project = await projectService.createProject(
            {...validProjectData, type: ProjectType.CAPITAL},
            testUserId
        );

        expect(project.type).toBe(ProjectType.CAPITAL);
        expect(project.projectCode).toContain('CAP');
      });

      it('should create MAINTENANCE project type', async () => {
        const project = await projectService.createProject(
            {...validProjectData, type: ProjectType.MAINTENANCE},
            testUserId
        );

        expect(project.type).toBe(ProjectType.MAINTENANCE);
        expect(project.projectCode).toContain('MNT');
      });
    });
  });