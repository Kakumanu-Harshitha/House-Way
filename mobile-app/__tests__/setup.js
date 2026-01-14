// Mock react-native-gesture-handler (avoid native module resolution in Jest)
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockGestureHandler = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }, props.children));
  MockGestureHandler.displayName = 'MockGestureHandler';

  return {
    Directions: {},
    State: {},
    GestureHandlerRootView: View,
    PanGestureHandler: MockGestureHandler,
    TapGestureHandler: MockGestureHandler,
    LongPressGestureHandler: MockGestureHandler,
    RotationGestureHandler: MockGestureHandler,
    FlingGestureHandler: MockGestureHandler,
    NativeViewGestureHandler: MockGestureHandler,
    Swipeable: View,
    DrawerLayout: View,
  };
});

// Prevent DevMenu TurboModule errors in Jest
jest.mock('react-native/src/private/devsupport/devmenu/specs/NativeDevMenu', () => ({}));
jest.mock('react-native/src/private/devsupport/devmenu/DevMenu', () => ({}));

// NativeEventEmitter can throw if constructed with null
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return function NativeEventEmitter() {
    return {
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
      removeSubscription: jest.fn(),
    };
  };
});

// Mock react-native modules
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    statusBarHeight: 20,
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// KeyboardAvoidingView subscribes to Keyboard events; ensure listeners are removable in Jest
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  isVisible: jest.fn(() => false),
  removeListener: jest.fn(),
  dismiss: jest.fn(),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock picker (native module) for Jest
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }) => React.createElement(View, props, children);
  const Item = () => null;
  return { Picker, Item };
});

// Global test utilities
global.mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

global.mockRoute = {
  params: {},
  key: 'test-key',
  name: 'test-screen',
};

// Mock user data for tests
global.mockUser = {
  _id: 'test-user-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  role: 'client',
  isActive: true,
};

// Mock project data for tests
global.mockProject = {
  _id: 'test-project-id',
  title: 'Test Project',
  description: 'Test project description',
  status: 'planning',
  client: global.mockUser._id,
  budget: {
    estimated: 50000,
    actual: 0,
  },
  progress: {
    percentage: 25,
  },
  location: {
    city: 'Test City',
    state: 'Test State',
  },
};

// Mock material request data for tests
global.mockMaterialRequest = {
  _id: 'test-material-request-id',
  project: global.mockProject._id,
  description: 'Test material request',
  status: 'pending',
  priority: 'medium',
  items: [
    {
      name: 'Test Item',
      quantity: 10,
      unit: 'pieces',
      estimatedCost: 100,
    },
  ],
  createdBy: global.mockUser._id,
};

// Mock quotation data for tests
global.mockQuotation = {
  _id: 'test-quotation-id',
  materialRequest: global.mockMaterialRequest._id,
  vendor: global.mockUser._id,
  status: 'pending',
  totalAmount: 1000,
  items: [
    {
      name: 'Test Item',
      quantity: 10,
      unitPrice: 100,
      totalPrice: 1000,
    },
  ],
};

// Console warnings suppression for tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
