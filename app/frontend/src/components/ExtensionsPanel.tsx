import { useState } from "react";
import { Search, Check, Download, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Extension {
  id: string;
  name: string;
  publisher: string;
  description: string;
  icon: string;
  stars: string;
  installed: boolean;
  category: string;
}

interface ExtensionsPanelProps {
  onExtensionToggle: (extId: string, enabled: boolean) => void;
  enabledExtensions: Set<string>;
}

const EXTENSIONS: Extension[] = [
  {
    id: "prettier",
    name: "Prettier",
    publisher: "Prettier",
    description: "Code formatter using Prettier. Formats JS, TS, CSS, HTML, JSON, and more.",
    icon: "🎨",
    stars: "12.4M",
    installed: false,
    category: "Formatters",
  },
  {
    id: "bracket-colorizer",
    name: "Bracket Pair Colorizer",
    publisher: "CoenraadS",
    description: "Colorizes matching brackets with distinct colors for better readability.",
    icon: "🌈",
    stars: "8.2M",
    installed: false,
    category: "Visual",
  },
  {
    id: "emmet",
    name: "Emmet",
    publisher: "Built-in",
    description: "Emmet abbreviations and snippets for HTML and CSS rapid development.",
    icon: "⚡",
    stars: "Built-in",
    installed: false,
    category: "Snippets",
  },
  {
    id: "auto-rename-tag",
    name: "Auto Rename Tag",
    publisher: "Jun Han",
    description: "Automatically rename paired HTML/XML tags when one is modified.",
    icon: "🏷️",
    stars: "6.1M",
    installed: false,
    category: "HTML",
  },
  {
    id: "indent-rainbow",
    name: "Indent Rainbow",
    publisher: "oderwat",
    description: "Colorizes indentation in front of your text, alternating colors on each step.",
    icon: "🌈",
    stars: "5.8M",
    installed: false,
    category: "Visual",
  },
  {
    id: "path-intellisense",
    name: "Path Intellisense",
    publisher: "Christian Kohler",
    description: "Autocompletes filenames and paths in your code.",
    icon: "📁",
    stars: "4.5M",
    installed: false,
    category: "IntelliSense",
  },
  {
    id: "material-icon-theme",
    name: "Material Icon Theme",
    publisher: "Philipp Kief",
    description: "Material Design icons for VS Code file explorer.",
    icon: "📦",
    stars: "11.2M",
    installed: false,
    category: "Themes",
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    publisher: "binaryify",
    description: "Atom's iconic One Dark theme for VS Code.",
    icon: "🎨",
    stars: "7.8M",
    installed: false,
    category: "Themes",
  },
  {
    id: "eslint",
    name: "ESLint",
    publisher: "Microsoft",
    description: "Integrates ESLint JavaScript linting into VS Code.",
    icon: "🔍",
    stars: "14.1M",
    installed: false,
    category: "Linters",
  },
  {
    id: "tailwindcss",
    name: "Tailwind CSS IntelliSense",
    publisher: "Tailwind Labs",
    description: "Intelligent Tailwind CSS tooling with autocomplete, syntax highlighting, and linting.",
    icon: "💨",
    stars: "6.3M",
    installed: false,
    category: "CSS",
  },
  {
    id: "gitlens",
    name: "GitLens",
    publisher: "GitKraken",
    description: "Supercharge Git within VS Code — visualize code authorship, navigate history.",
    icon: "🔮",
    stars: "10.5M",
    installed: false,
    category: "Git",
  },
  {
    id: "live-server",
    name: "Live Server",
    publisher: "Ritwick Dey",
    description: "Launch a local development server with live reload for static & dynamic pages.",
    icon: "🌐",
    stars: "9.7M",
    installed: false,
    category: "Tools",
  },
];

export default function ExtensionsPanel({
  onExtensionToggle,
  enabledExtensions,
}: ExtensionsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExtensions = EXTENSIONS.filter(
    (ext) =>
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(EXTENSIONS.map((e) => e.category))];

  const handleToggle = (ext: Extension) => {
    const isEnabled = enabledExtensions.has(ext.id);
    onExtensionToggle(ext.id, !isEnabled);
    if (!isEnabled) {
      toast.success(`${ext.name} enabled`, {
        description: ext.description,
      });
    } else {
      toast.info(`${ext.name} disabled`);
    }
  };

  return (
    <div className="h-full bg-[#252526] border-r border-[#3E3E42] flex flex-col">
      <div className="p-3 border-b border-[#3E3E42]">
        <span className="text-xs font-semibold text-[#858585] uppercase tracking-wider">
          Extensions
        </span>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#3E3E42]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions..."
            className="bg-[#1E1E1E] border-[#3E3E42] text-[#CCCCCC] text-xs h-7 pl-7 placeholder:text-[#555]"
          />
        </div>
      </div>

      {/* Extension List */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {searchQuery ? (
            filteredExtensions.map((ext) => (
              <ExtensionItem
                key={ext.id}
                ext={ext}
                isEnabled={enabledExtensions.has(ext.id)}
                onToggle={() => handleToggle(ext)}
              />
            ))
          ) : (
            categories.map((cat) => (
              <div key={cat} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-semibold text-[#858585] uppercase">
                  {cat}
                </div>
                {EXTENSIONS.filter((e) => e.category === cat).map((ext) => (
                  <ExtensionItem
                    key={ext.id}
                    ext={ext}
                    isEnabled={enabledExtensions.has(ext.id)}
                    onToggle={() => handleToggle(ext)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ExtensionItem({
  ext,
  isEnabled,
  onToggle,
}: {
  ext: Extension;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-2 p-2 hover:bg-[#2A2D2E] rounded cursor-pointer group">
      <div className="w-8 h-8 bg-[#333] rounded flex items-center justify-center text-lg shrink-0">
        {ext.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-white truncate">
            {ext.name}
          </span>
          {isEnabled && (
            <Badge
              variant="secondary"
              className="bg-[#007ACC] text-white text-[9px] px-1 py-0 h-4"
            >
              Active
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-[#858585] truncate">
          {ext.publisher}
        </p>
        <p className="text-[10px] text-[#858585] line-clamp-2 mt-0.5">
          {ext.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-0.5 text-[9px] text-[#858585]">
            <Star className="w-2.5 h-2.5" />
            {ext.stars}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`h-6 px-2 text-[10px] shrink-0 ${
          isEnabled
            ? "text-[#4EC9B0] hover:text-[#4EC9B0] hover:bg-[#333]"
            : "text-[#007ACC] hover:text-[#007ACC] hover:bg-[#333]"
        }`}
      >
        {isEnabled ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            Enabled
          </>
        ) : (
          <>
            <Download className="w-3 h-3 mr-1" />
            Install
          </>
        )}
      </Button>
    </div>
  );
}