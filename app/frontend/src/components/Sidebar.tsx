import {
  FileCode,
  FileJson,
  FileType,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  Trash2,
  Pencil,
  File,
  RefreshCw,
  ChevronsUpDown,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface SidebarProps {
  fileTree: FileNode[];
  activeFile: string;
  openFiles: string[];
  onFileSelect: (filepath: string) => void;
  onCreateFile: (dirPath: string, name: string) => void;
  onCreateFolder: (dirPath: string, name: string) => void;
  onDeleteFile: (filepath: string) => void;
  onRenameFile: (oldPath: string, newName: string) => void;
  onMoveFile?: (sourcePath: string, targetDir: string) => void;
}

export default function Sidebar({
  fileTree,
  activeFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
}: SidebarProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set([".", "src"])
  );
  const [creatingIn, setCreatingIn] = useState<{
    dir: string;
    type: "file" | "folder";
  } | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [dragOverDir, setDragOverDir] = useState<string | null>(null);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [creatingIn, renamingFile]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedDirs(new Set(["."]));
  }, []);

  const refreshTree = useCallback(() => {
    // Force re-render by toggling expanded state
    setExpandedDirs((prev) => new Set(prev));
  }, []);

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        return <FileCode className="w-4 h-4 text-[#E34C26] shrink-0" />;
      case "css":
      case "scss":
        return <FileType className="w-4 h-4 text-[#264DE4] shrink-0" />;
      case "js":
      case "jsx":
        return <FileCode className="w-4 h-4 text-[#F7DF1E] shrink-0" />;
      case "ts":
      case "tsx":
        return <FileCode className="w-4 h-4 text-[#3178C6] shrink-0" />;
      case "json":
        return <FileJson className="w-4 h-4 text-[#4EC9B0] shrink-0" />;
      case "md":
        return <File className="w-4 h-4 text-[#519ABA] shrink-0" />;
      case "svg":
      case "png":
      case "jpg":
      case "gif":
        return <File className="w-4 h-4 text-[#FFB13B] shrink-0" />;
      default:
        return <FileCode className="w-4 h-4 text-[#858585] shrink-0" />;
    }
  };

  const handleInputSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      if (creatingIn) {
        if (creatingIn.type === "file") {
          onCreateFile(creatingIn.dir, inputValue.trim());
        } else {
          onCreateFolder(creatingIn.dir, inputValue.trim());
        }
        setCreatingIn(null);
      } else if (renamingFile) {
        onRenameFile(renamingFile, inputValue.trim());
        setRenamingFile(null);
      }
      setInputValue("");
    } else if (e.key === "Escape") {
      setCreatingIn(null);
      setRenamingFile(null);
      setInputValue("");
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, fullPath: string) => {
    e.dataTransfer.setData("text/plain", fullPath);
    e.dataTransfer.effectAllowed = "move";
    setDraggingPath(fullPath);
    // Add a drag image
    const el = e.currentTarget as HTMLElement;
    if (el) {
      e.dataTransfer.setDragImage(el, 10, 10);
    }
  };

  const handleDragOver = (e: React.DragEvent, dirPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDir !== dirPath) {
      setDragOverDir(dirPath);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're leaving the actual element
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverDir(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDir: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = e.dataTransfer.getData("text/plain");
    setDragOverDir(null);
    setDraggingPath(null);

    if (sourcePath && onMoveFile && sourcePath !== targetDir) {
      // Don't allow dropping into itself or its children
      if (!targetDir.startsWith(sourcePath + "/") && targetDir !== sourcePath) {
        // Auto-expand target directory
        setExpandedDirs((prev) => {
          const next = new Set(prev);
          next.add(targetDir);
          return next;
        });
        onMoveFile(sourcePath, targetDir);
      }
    }
  };

  const handleDragEnd = () => {
    setDragOverDir(null);
    setDraggingPath(null);
  };

  const startCreating = (dir: string, type: "file" | "folder") => {
    setCreatingIn({ dir, type });
    setInputValue("");
    // Auto-expand the target directory
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      next.add(dir);
      return next;
    });
  };

  const renderNode = (node: FileNode, parentPath: string, depth: number) => {
    const fullPath =
      parentPath === "." ? node.name : `${parentPath}/${node.name}`;
    const isExpanded = expandedDirs.has(fullPath);
    const isActive = activeFile === fullPath;
    const paddingLeft = depth * 12 + 8;
    const isDragOver = dragOverDir === fullPath;
    const isDragging = draggingPath === fullPath;

    if (node.type === "directory") {
      return (
        <div key={fullPath}>
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                className={`group flex items-center gap-1 py-[3px] hover:bg-[#2A2D2E] cursor-pointer text-sm transition-all duration-150 ${
                  isDragOver
                    ? "bg-[#094771] outline outline-1 outline-[#007ACC] rounded-sm"
                    : ""
                } ${isDragging ? "opacity-40" : ""}`}
                style={{ paddingLeft }}
                onClick={() => toggleDir(fullPath)}
                draggable={fullPath !== "."}
                onDragStart={(e) => handleDragStart(e, fullPath)}
                onDragOver={(e) => handleDragOver(e, fullPath)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, fullPath)}
                onDragEnd={handleDragEnd}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#858585] shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#858585] shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-[#DCAA5F] shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-[#DCAA5F] shrink-0" />
                )}
                {renamingFile === fullPath ? (
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputSubmit}
                    onBlur={() => {
                      setRenamingFile(null);
                      setInputValue("");
                    }}
                    className="bg-[#1E1E1E] border border-[#007ACC] text-[#CCCCCC] text-sm px-1 py-0 outline-none rounded w-full max-w-[140px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-[#CCCCCC] truncate">{node.name}</span>
                )}

                {/* Inline action buttons on hover */}
                {renamingFile !== fullPath && (
                  <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                    <button
                      className="hover:bg-[#444] rounded p-0.5"
                      title="New File"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCreating(fullPath, "file");
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 text-[#858585] hover:text-white" />
                    </button>
                    <button
                      className="hover:bg-[#444] rounded p-0.5"
                      title="New Folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCreating(fullPath, "folder");
                      }}
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[#858585] hover:text-white" />
                    </button>
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-[#252526] border-[#3E3E42]">
              <ContextMenuItem
                className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
                onClick={() => startCreating(fullPath, "file")}
              >
                <Plus className="w-4 h-4 mr-2" /> New File
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
                onClick={() => startCreating(fullPath, "folder")}
              >
                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
              </ContextMenuItem>
              {fullPath !== "." && (
                <>
                  <ContextMenuSeparator className="bg-[#3E3E42]" />
                  <ContextMenuItem
                    className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
                    onClick={() => {
                      setRenamingFile(fullPath);
                      setInputValue(node.name);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Rename
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-[#F44747] focus:bg-[#094771] focus:text-[#F44747]"
                    onClick={() => onDeleteFile(fullPath)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>

          {isExpanded && (
            <div>
              {creatingIn?.dir === fullPath && (
                <div
                  className="flex items-center gap-1 py-[3px]"
                  style={{ paddingLeft: paddingLeft + 20 }}
                >
                  {creatingIn.type === "file" ? (
                    <File className="w-4 h-4 text-[#858585] shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-[#DCAA5F] shrink-0" />
                  )}
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputSubmit}
                    onBlur={() => {
                      setCreatingIn(null);
                      setInputValue("");
                    }}
                    className="bg-[#1E1E1E] border border-[#007ACC] text-[#CCCCCC] text-sm px-1 py-0 outline-none rounded w-full max-w-[160px]"
                    placeholder={
                      creatingIn.type === "file" ? "filename" : "folder name"
                    }
                  />
                </div>
              )}
              {node.children?.map((child) =>
                renderNode(child, fullPath, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    // File node
    return (
      <ContextMenu key={fullPath}>
        <ContextMenuTrigger>
          <div
            className={`group flex items-center gap-2 py-[3px] hover:bg-[#2A2D2E] cursor-pointer text-sm transition-all duration-150 ${
              isActive
                ? "bg-[#37373D] text-white"
                : "text-[#CCCCCC]"
            } ${isDragging ? "opacity-40" : ""}`}
            style={{ paddingLeft: paddingLeft + 20 }}
            onClick={() => onFileSelect(fullPath)}
            draggable
            onDragStart={(e) => handleDragStart(e, fullPath)}
            onDragEnd={handleDragEnd}
          >
            {renamingFile === fullPath ? (
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputSubmit}
                onBlur={() => {
                  setRenamingFile(null);
                  setInputValue("");
                }}
                className="bg-[#1E1E1E] border border-[#007ACC] text-[#CCCCCC] text-sm px-1 py-0 outline-none rounded w-full max-w-[160px]"
              />
            ) : (
              <>
                {getFileIcon(node.name)}
                <span className="truncate flex-1">{node.name}</span>
              </>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-[#252526] border-[#3E3E42]">
          <ContextMenuItem
            className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
            onClick={() => {
              setRenamingFile(fullPath);
              setInputValue(node.name);
            }}
          >
            <Pencil className="w-4 h-4 mr-2" /> Rename
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-[#3E3E42]" />
          <ContextMenuItem
            className="text-[#F44747] focus:bg-[#094771] focus:text-[#F44747]"
            onClick={() => onDeleteFile(fullPath)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  // Root-level creation input (when creating at ".")
  const rootCreationInput = creatingIn?.dir === "." ? (
    <div className="flex items-center gap-1 py-[3px] px-2">
      {creatingIn.type === "file" ? (
        <File className="w-4 h-4 text-[#858585] shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-[#DCAA5F] shrink-0" />
      )}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleInputSubmit}
        onBlur={() => {
          setCreatingIn(null);
          setInputValue("");
        }}
        className="bg-[#1E1E1E] border border-[#007ACC] text-[#CCCCCC] text-sm px-1 py-0 outline-none rounded w-full max-w-[160px]"
        placeholder={creatingIn.type === "file" ? "filename" : "folder name"}
      />
    </div>
  ) : null;

  return (
    <div className="h-full bg-[#252526] border-r border-[#3E3E42] flex flex-col select-none">
      {/* Explorer Header */}
      <div className="px-3 py-2 border-b border-[#3E3E42] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#BBBBBB] uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => startCreating(".", "file")}
                className="hover:bg-[#3E3E42] rounded p-1 transition-colors"
                title="New File..."
              >
                <Plus className="w-4 h-4 text-[#CCCCCC]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#333] text-white text-xs border-[#555]">
              New File
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => startCreating(".", "folder")}
                className="hover:bg-[#3E3E42] rounded p-1 transition-colors"
                title="New Folder..."
              >
                <FolderPlus className="w-4 h-4 text-[#CCCCCC]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#333] text-white text-xs border-[#555]">
              New Folder
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={refreshTree}
                className="hover:bg-[#3E3E42] rounded p-1 transition-colors"
                title="Refresh Explorer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#CCCCCC]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#333] text-white text-xs border-[#555]">
              Refresh
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={collapseAll}
                className="hover:bg-[#3E3E42] rounded p-1 transition-colors"
                title="Collapse Folders"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#CCCCCC]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#333] text-white text-xs border-[#555]">
              Collapse All
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* File Tree */}
      <div
        className={`flex-1 overflow-y-auto py-1 transition-colors ${
          dragOverDir === "." ? "bg-[#094771]/20" : ""
        }`}
        onDragOver={(e) => handleDragOver(e, ".")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, ".")}
      >
        {rootCreationInput}
        {fileTree.map((node) => renderNode(node, ".", 0))}
      </div>

      {/* Drop zone indicator at bottom */}
      {draggingPath && (
        <div className="h-6 border-t border-[#3E3E42] flex items-center justify-center">
          <span className="text-[10px] text-[#858585]">
            Drop here to move to root
          </span>
        </div>
      )}
    </div>
  );
}