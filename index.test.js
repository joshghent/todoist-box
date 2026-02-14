const { TodoistApi } = require('@doist/todoist-api-typescript');
const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');

// Mock the modules
jest.mock('@doist/todoist-api-typescript');
jest.mock('@octokit/rest');
jest.mock('@actions/core');

describe('todoist-box', () => {
  let mockTodoistApi;
  let mockOctokit;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup Todoist API mock
    mockTodoistApi = {
      getTasks: jest.fn()
    };
    TodoistApi.mockImplementation(() => mockTodoistApi);
    
    // Setup Octokit mock
    mockOctokit = {
      gists: {
        get: jest.fn(),
        update: jest.fn()
      }
    };
    Octokit.mockImplementation(() => mockOctokit);
    
    // Setup environment variables
    process.env.TODOIST_API_TOKEN = 'test-todoist-token';
    process.env.GH_TOKEN = 'test-gh-token';
    process.env.GIST_ID = 'test-gist-id';
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.TODOIST_API_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GIST_ID;
  });
  
  describe('Task Formatting', () => {
    test('formats tasks with priorities correctly', async () => {
      const mockTasks = [
        { content: 'High priority task', priority: 4, due: null },
        { content: 'Medium priority task', priority: 3, due: null },
        { content: 'Low priority task', priority: 2, due: null },
        { content: 'No priority task', priority: 1, due: null }
      ];
      
      mockTodoistApi.getTasks.mockResolvedValue(mockTasks);
      mockOctokit.gists.get.mockResolvedValue({
        data: {
          files: {
            'todoist.md': {
              filename: 'todoist.md'
            }
          }
        }
      });
      
      // Import and run the main function
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      expect(mockOctokit.gists.update).toHaveBeenCalled();
      const updateCall = mockOctokit.gists.update.mock.calls[0][0];
      const content = updateCall.files['todoist.md'].content;
      
      expect(content).toContain('🔴 High priority task');
      expect(content).toContain('🟠 Medium priority task');
      expect(content).toContain('🔵 Low priority task');
      expect(content).toContain('⚪ No priority task');
    });
    
    test('formats tasks with due dates correctly', async () => {
      const mockTasks = [
        { 
          content: 'Task with due date', 
          priority: 1, 
          due: { date: '2024-12-25' } 
        },
        { 
          content: 'Task without due date', 
          priority: 1, 
          due: null 
        }
      ];
      
      mockTodoistApi.getTasks.mockResolvedValue(mockTasks);
      mockOctokit.gists.get.mockResolvedValue({
        data: {
          files: {
            'todoist.md': {
              filename: 'todoist.md'
            }
          }
        }
      });
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      const updateCall = mockOctokit.gists.update.mock.calls[0][0];
      const content = updateCall.files['todoist.md'].content;
      
      expect(content).toContain('📅 2024-12-25');
    });
    
    test('handles empty task list', async () => {
      mockTodoistApi.getTasks.mockResolvedValue([]);
      mockOctokit.gists.get.mockResolvedValue({
        data: {
          files: {
            'todoist.md': {
              filename: 'todoist.md'
            }
          }
        }
      });
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      const updateCall = mockOctokit.gists.update.mock.calls[0][0];
      const content = updateCall.files['todoist.md'].content;
      
      expect(content).toContain('No tasks for today!');
    });
  });
  
  describe('API Integration', () => {
    test('calls Todoist API with correct filter', async () => {
      mockTodoistApi.getTasks.mockResolvedValue([]);
      mockOctokit.gists.get.mockResolvedValue({
        data: {
          files: {
            'todoist.md': {
              filename: 'todoist.md'
            }
          }
        }
      });
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
        filter: 'today | overdue'
      });
    });
    
    test('updates gist with correct parameters', async () => {
      const mockTasks = [
        { content: 'Test task', priority: 1, due: null }
      ];
      
      mockTodoistApi.getTasks.mockResolvedValue(mockTasks);
      mockOctokit.gists.get.mockResolvedValue({
        data: {
          files: {
            'todoist.md': {
              filename: 'todoist.md'
            }
          }
        }
      });
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      expect(mockOctokit.gists.update).toHaveBeenCalledWith(
        expect.objectContaining({
          gist_id: 'test-gist-id',
          files: expect.any(Object)
        })
      );
    });
  });
  
  describe('Error Handling', () => {
    test('handles Todoist API errors gracefully', async () => {
      mockTodoistApi.getTasks.mockRejectedValue(new Error('Todoist API error'));
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      expect(core.setFailed).toHaveBeenCalledWith('Todoist API error');
    });
    
    test('handles GitHub API errors gracefully', async () => {
      mockTodoistApi.getTasks.mockResolvedValue([]);
      mockOctokit.gists.get.mockRejectedValue(new Error('GitHub API error'));
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      expect(core.setFailed).toHaveBeenCalledWith('GitHub API error');
    });
    
    test('handles missing environment variables', async () => {
      delete process.env.TODOIST_API_TOKEN;
      
      delete require.cache[require.resolve('./index.js')];
      await require('./index.js');
      
      expect(core.setFailed).toHaveBeenCalled();
    });
  });
});
