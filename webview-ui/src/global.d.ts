/// <reference types="vite/client" />

interface Window {
  vscode: {
    postMessage: (message: any) => void;
  };
}
