import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownProps = {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-1 text-xl font-semibold tracking-normal text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 text-base font-semibold tracking-normal text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-sm font-semibold tracking-normal text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 text-sm font-semibold tracking-normal text-foreground">{children}</h4>
          ),
          p: ({ children }) => <p className="text-foreground/90">{children}</p>,
          ul: ({ children }) => <ul className="space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="text-foreground/90">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 pl-3 text-muted-foreground">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-5">{children}</pre>
          ),
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b px-2 py-1.5 align-top">{children}</th>,
          td: ({ children }) => <td className="border-b px-2 py-1.5 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
