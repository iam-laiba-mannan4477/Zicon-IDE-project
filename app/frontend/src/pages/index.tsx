import { useState } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import EditorPanel from '@/components/EditorPanel';
import PreviewPanel from '@/components/PreviewPanel';

export default function Index() {
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [files, setFiles] = useState<Record<string, string>>({
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Hello, StackBlitz!</h1>
    <p>Start editing to see changes.</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    'styles.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
}

h1 {
  color: #333;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  color: #666;
  font-size: 1.2rem;
}`,
    'script.js': `console.log('Welcome to StackBlitz!');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  
  container.addEventListener('click', () => {
    console.log('Container clicked!');
  });
});`,
    'package.json': `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A StackBlitz-like project",
  "main": "index.html",
  "scripts": {
    "start": "serve ."
  }
}`
  });

  const updateFileContent = (filename: string, content: string) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
  };

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] text-[#CCCCCC] overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          files={files} 
          activeFile={activeFile} 
          onFileSelect={setActiveFile} 
        />
        <EditorPanel 
          activeFile={activeFile}
          content={files[activeFile] || ''}
          onContentChange={(content) => updateFileContent(activeFile, content)}
        />
        <PreviewPanel files={files} />
      </div>
    </div>
  );
}