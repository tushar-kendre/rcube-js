# RCube.js 🧩

A modern, interactive 3D Rubik's Cube web application built with React, Three.js, and TypeScript. Experience the classic puzzle in your browser with smooth animations, intuitive controls, and a beautiful modern interface.

![RCube.js](packages/web/public/rcube.svg)

## ✨ Features

- **Interactive 3D Rubik's Cube**: Full 3D visualization with realistic cube mechanics
- **Smooth Animations**: Fluid piece rotations and transitions
- **Intuitive Controls**: Click-to-rotate interface with visual feedback
- **Modern UI**: Clean, responsive design with dark/light theme support
- **Performance Optimized**: Lazy loading and efficient rendering
- **TypeScript**: Full type safety throughout the codebase
- **Testing**: Comprehensive test suite with Vitest
- **Modern Tooling**: Yarn workspaces, ESLint, Prettier, and more

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or later)
- **Yarn** (v4.9.1 or later) - This project uses Yarn 4

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rcube-js.git
   cd rcube-js
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Start the development server**
   ```bash
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application in action!

## 📦 Project Structure

This is a monorepo managed with Yarn workspaces:

```
rcube-js/
├── packages/
│   ├── api/          # Backend API (future implementation)
│   └── web/          # React frontend application
│       ├── src/
│       │   ├── components/   # React components
│       │   │   ├── cube/     # Cube-specific components
│       │   │   └── ui/       # Reusable UI components
│       │   ├── hooks/        # Custom React hooks
│       │   ├── lib/          # Utility functions
│       │   ├── types/        # TypeScript type definitions
│       │   └── test/         # Test utilities
│       └── public/           # Static assets
└── ...config files
```

## 🛠️ Available Scripts

### Root Level Commands

- `yarn dev` - Start development servers for all packages
- `yarn build` - Build all packages for production
- `yarn format` - Format code with Prettier
- `yarn commit` - Create conventional commits with Commitizen

### Web Package Commands

Navigate to `packages/web/` and run:

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn lint` - Lint code with ESLint

## 🎮 How to Use

1. **Rotate the Cube**: Click and drag to rotate the entire cube view
2. **Move Pieces**: Click on cube pieces to rotate face layers
3. **Theme Toggle**: Use the theme switcher in the header to change between light and dark modes
4. **Reset**: Use the controls to scramble or reset the cube to solved state

## 🧪 Testing

The project uses Vitest for testing with React Testing Library:

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests once (CI mode)
yarn test:run
```

## 🏗️ Tech Stack

### Frontend (`packages/web/`)
- **React 19** - Modern React with hooks and concurrent features
- **Three.js** - 3D graphics and WebGL rendering
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for react-three-fiber
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **Lucide React** - Beautiful SVG icons

### Development Tools
- **Vitest** - Fast unit testing framework
- **ESLint** - Code linting and quality checks
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality gates
- **Commitizen** - Conventional commit messages
- **Changesets** - Version management and changelog generation

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Run quality checks**
   ```bash
   yarn format    # Format code
   yarn lint      # Check linting
   yarn test      # Run tests
   ```

4. **Commit your changes**
   ```bash
   yarn commit    # Use conventional commits
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- **TypeScript**: Use strict typing, avoid `any`
- **React**: Use functional components with hooks
- **Naming**: Use camelCase for variables/functions, PascalCase for components
- **Testing**: Write tests for new features and bug fixes
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

### Pull Request Process

1. **Ensure all checks pass** (tests, linting, formatting)
2. **Update documentation** if you're changing functionality
3. **Add a clear description** of what your PR does
4. **Link any related issues**
5. **Request review** from maintainers

### Reporting Issues

When reporting bugs, please include:

- **Operating System** and browser version
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** or error messages if applicable

### Feature Requests

We're always looking for ways to improve RCube.js! When suggesting features:

- **Check existing issues** to avoid duplicates
- **Describe the use case** and why it would be valuable
- **Consider implementation complexity** and alternatives

## 📝 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** community for the amazing 3D library
- **React Three Fiber** team for the excellent React integration
- **Radix UI** for the accessible component primitives
- The open-source community for inspiration and tools

## 🔗 Links

- [Live Demo](https://your-username.github.io/rcube-js) (Coming Soon)
- [Report Bug](https://github.com/your-username/rcube-js/issues)
- [Request Feature](https://github.com/your-username/rcube-js/issues)

---

Made with ❤️ by the RCube.js team. Happy cubing! 🧩✨
