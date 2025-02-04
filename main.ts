import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { CSS, render } from "https://deno.land/x/gfm@0.1.22/mod.ts";

const black_list = [
  // {
  //   "before" :"/bin_index",
  //   "after": "http://127.0.0.1:8000/https://w-corp.staticblitz.com/bin_index"
  // },
  // {
  //   "before": "https://w-corp.staticblitz.com/webcontainer",
  //   "after": "http://127.0.0.1:8000/https://w-corp.staticblitz.com/webcontainer"
  // }
]

function addCorsIfNeeded(response: Response) {
  const headers = new Headers(response.headers);

  if (!headers.has("access-control-allow-origin")) {
    headers.set("access-control-allow-origin", "*");
  }

  return headers;
}

function isUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function handleRequest(request: Request) {
  const { pathname, search } = new URL(request.url);
  const url = pathname.substring(1) + search;

  if (isUrl(url)) {
    console.log("proxy to %s", url);
    const corsHeaders = addCorsIfNeeded(new Response());
    if (request.method.toUpperCase() === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const req = new Request(request)

    if (!req.headers.get("origin")?.startsWith("http")){
      req.headers.set("origin", "http://localhost:3000")
    }

    if (!req.headers.get("referer")?.startsWith("http")){
      req.headers.set("referer", "http://localhost:3000")
    }

    const response = await fetch(url, req);
    const headers = addCorsIfNeeded(response);
    let restxt = await response.text()

    if (black_list.map((item) => {return restxt.includes(item["before"])}).includes(true)) {
      black_list.map((item) => {
        restxt = restxt.replaceAll(item["before"], item["after"])
      })
      return new Response(restxt, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } else {
      const response = await fetch(url, req);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }

  const readme = await Deno.readTextFile("./README.md");
  const body = render(readme);
  const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CORS Proxy</title>
        <style>
          body {
            margin: 0;
            background-color: var(--color-canvas-default);
            color: var(--color-fg-default);
          }
          main {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
          }
          ${CSS}
        </style>
      </head>
      <body data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
        <main class="markdown-body">
          ${body}
        </main>
      </body>
    </html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=utf-8",
    },
  });
}

const port = Deno.env.get("PORT") ?? "8000";

serve(handleRequest, { port: Number(port) });
