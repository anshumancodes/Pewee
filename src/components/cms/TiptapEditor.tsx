"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import bash from "highlight.js/lib/languages/bash";
import { useEffect, useRef, useCallback } from "react";

const lowlight = createLowlight();
lowlight.register({ javascript: js, typescript: ts, css, bash });

//Toolbar button
function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur
        onClick();
      }}
      title={title}
      className={`rounded px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-accent hover:bg-background hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

//Editor component
export default function TiptapEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  // Track whether the value change was triggered by the editor itself to
  // avoid the sync loop: type → onChange → value prop changes → setContent → cursor reset
  const internalUpdateRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Placeholder.configure({ placeholder: "Write your post here…" }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value,
    onUpdate({ editor }) {
      internalUpdateRef.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] px-5 py-4 text-base text-accent leading-relaxed outline-none prose prose-invert max-w-none prose-sm font-body",
      },
    },
  });

  // Sync external value into editor ONLY when it was not triggered by the editor itself.
  // This handles the edit-mode initial load and external resets without resetting the cursor mid-type.
  useEffect(() => {
    if (!editor) return;
    if (internalUpdateRef.current) {
      // Value change came from the editor — skip syncing back to avoid cursor reset
      internalUpdateRef.current = false;
      return;
    }
    // External change (e.g. initial load for edit mode, or form reset)
    const currentHTML = editor.getHTML();
    if (value !== currentHTML) {
      // @ts-expect-error Tiptap's legacy boolean overload is still used here.
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  const insertImageFile = useCallback((file: File) => {
    if (!editor || !file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      window.alert("Choose an image smaller than 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
      }
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const addImage = useCallback(() => fileInputRef.current?.click(), []);

  const setLink = useCallback(() => {
    const prev = editor?.getAttributes("link").href ?? "";
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-sm border border-border bg-surface overflow-hidden focus-within:border-accent transition-colors [&_.tiptap_h1]:text-3xl [&_.tiptap_h2]:text-2xl [&_.tiptap_h3]:text-xl [&_.tiptap_h4]:text-lg [&_.tiptap_h1]:font-head [&_.tiptap_h2]:font-head [&_.tiptap_h3]:font-head [&_.tiptap_h4]:font-head [&_.tiptap_h1]:font-bold [&_.tiptap_h2]:font-bold [&_.tiptap_h3]:font-bold [&_.tiptap_h4]:font-bold [&_.tiptap_h1]:text-foreground [&_.tiptap_h2]:text-foreground [&_.tiptap_h3]:text-foreground [&_.tiptap_h4]:text-foreground [&_.tiptap_p]:text-accent [&_.tiptap_strong]:text-foreground [&_.tiptap_img]:rounded-sm [&_.tiptap_img]:border [&_.tiptap_img]:border-border"
      onDrop={(event) => {
        const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
        if (file) { event.preventDefault(); insertImageFile(file); }
      }}
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))) event.preventDefault();
      }}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
        if (file) { event.preventDefault(); insertImageFile(file); }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) insertImageFile(file);
          event.currentTarget.value = "";
        }}
      />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background px-2 py-1.5">
        {/* Text style */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Inline code"
        >
          {"<>"}
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-gray-200" />

        {/* Headings */}
        {([1, 2, 3, 4] as const).map((level) => (
          <ToolbarBtn
            key={level}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            active={editor.isActive("heading", { level })}
            title={`Heading ${level}`}
          >
            H{level}
          </ToolbarBtn>
        ))}

        <span className="mx-1 h-4 w-px bg-gray-200" />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          • List
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered list"
        >
          1. List
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-gray-200" />

        {/* Blocks */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          {"❝"}
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code block"
        >
          {"{ }"}
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
          active={false}
        >
          —
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-gray-200" />

        {/* Media / link */}
        <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link">
          Link
        </ToolbarBtn>
        <ToolbarBtn onClick={addImage} title="Insert image from your device" active={false}>
          + Image
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-gray-200" />

        {/* History */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
          active={false}
        >
          ↩
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
          active={false}
        >
          ↪
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
