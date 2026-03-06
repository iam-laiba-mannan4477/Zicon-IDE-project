import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClone: (files: Record<string, string>, repoName: string) => void;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

export default function CloneDialog({
  open,
  onOpenChange,
  onClone,
}: CloneDialogProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState("");

  const parseRepoUrl = (
    url: string
  ): { owner: string; repo: string; branch?: string } | null => {
    const cleaned = url.trim().replace(/\.git$/, "").replace(/\/$/, "");

    // Check for tree/branch
    const treeMatch = cleaned.match(
      /github\.com\/([^/]+)\/([^/]+)\/tree\/(.+)/
    );
    if (treeMatch) {
      return { owner: treeMatch[1], repo: treeMatch[2], branch: treeMatch[3] };
    }

    // Standard URL
    const urlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2] };
    }

    // Short format: owner/repo
    const shortMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
    if (shortMatch) {
      return { owner: shortMatch[1], repo: shortMatch[2] };
    }

    return null;
  };

  const handleClone = async () => {
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      toast.error("Invalid GitHub URL. Use format: owner/repo or full URL");
      return;
    }

    setIsCloning(true);
    setProgress("Fetching repository info...");

    try {
      const { owner, repo, branch } = parsed;

      // Get default branch if not specified
      let targetBranch = branch;
      if (!targetBranch) {
        const repoRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`
        );
        if (!repoRes.ok) {
          throw new Error(
            `Repository not found: ${owner}/${repo}. Make sure it is a public repository.`
          );
        }
        const repoData = await repoRes.json();
        targetBranch = repoData.default_branch || "main";
      }

      setProgress(`Fetching file tree (${targetBranch})...`);

      // Get the tree recursively
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`
      );
      if (!treeRes.ok) {
        throw new Error("Failed to fetch repository tree");
      }
      const treeData = await treeRes.json();

      if (treeData.truncated) {
        toast.warning(
          "Repository is very large. Some files may be missing."
        );
      }

      const files: Record<string, string> = {};
      const blobs: GitHubTreeItem[] = treeData.tree.filter(
        (item: GitHubTreeItem) => item.type === "blob"
      );

      // Filter out binary files and very large files
      const textExtensions = new Set([
        "js", "jsx", "ts", "tsx", "html", "css", "scss", "less", "json",
        "md", "txt", "yml", "yaml", "toml", "xml", "svg", "sh", "bash",
        "py", "rb", "go", "rs", "java", "c", "cpp", "h", "hpp",
        "gitignore", "env", "example", "config", "lock", "dockerfile",
        "makefile", "sql", "graphql", "prisma", "vue", "svelte",
      ]);

      const isTextFile = (path: string) => {
        const ext = path.split(".").pop()?.toLowerCase() || "";
        const name = path.split("/").pop()?.toLowerCase() || "";
        return (
          textExtensions.has(ext) ||
          name === "dockerfile" ||
          name === "makefile" ||
          name === ".gitignore" ||
          name === ".env" ||
          name === ".env.example" ||
          name === "license" ||
          name === "readme"
        );
      };

      const textBlobs = blobs.filter(
        (b) => isTextFile(b.path) && (b.size || 0) < 500000
      );

      setProgress(`Downloading ${textBlobs.length} files...`);

      // Download files in batches
      const batchSize = 10;
      for (let i = 0; i < textBlobs.length; i += batchSize) {
        const batch = textBlobs.slice(i, i + batchSize);
        setProgress(
          `Downloading files... (${Math.min(i + batchSize, textBlobs.length)}/${textBlobs.length})`
        );

        const results = await Promise.allSettled(
          batch.map(async (blob) => {
            const res = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${blob.path}?ref=${targetBranch}`,
              {
                headers: { Accept: "application/vnd.github.v3.raw" },
              }
            );
            if (res.ok) {
              const text = await res.text();
              return { path: blob.path, content: text };
            }
            return null;
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            files[result.value.path] = result.value.content;
          }
        }
      }

      if (Object.keys(files).length === 0) {
        throw new Error("No files could be downloaded from the repository");
      }

      setProgress("Done!");
      onClone(files, repo);
      onOpenChange(false);
      toast.success(
        `Cloned ${repo} — ${Object.keys(files).length} files loaded`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to clone repository"
      );
    } finally {
      setIsCloning(false);
      setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#252526] border-[#3E3E42] text-[#CCCCCC] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-lg flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#007ACC]" />
            Clone from GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[#CCCCCC]">Repository URL</Label>
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo or owner/repo"
              className="bg-[#1E1E1E] border-[#3E3E42] text-[#CCCCCC] placeholder:text-[#555]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCloning) handleClone();
              }}
            />
            <p className="text-xs text-[#858585]">
              Supports public GitHub repositories. Enter the full URL or
              owner/repo format.
            </p>
          </div>

          {progress && (
            <div className="flex items-center gap-2 text-sm text-[#858585]">
              <Loader2 className="w-4 h-4 animate-spin text-[#007ACC]" />
              {progress}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white"
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClone}
            disabled={!repoUrl.trim() || isCloning}
            className="bg-[#007ACC] text-white hover:bg-[#006BB3]"
          >
            {isCloning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cloning...
              </>
            ) : (
              "Clone Repository"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}