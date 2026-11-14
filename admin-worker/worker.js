const API = "https://api.github.com";
const ADMIN_PATH = "/alcatelonetouch3075m/";
const POSTS_PATH = "assets/data/posts.json";

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin"
    }
  });
}
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, value => value.toString(16).padStart(2, "0")).join("");
}
function base64ToUtf8(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}
function validPost(post) {
  return post && typeof post === "object"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug || "")
    && typeof post.title === "string" && post.title.trim().length > 0 && post.title.length <= 120
    && typeof post.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(post.date)
    && typeof post.excerpt === "string" && post.excerpt.length <= 240
    && typeof post.content === "string" && post.content.length <= 50000
    && typeof post.published === "boolean";
}
function corsOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  return origin === env.ADMIN_ORIGIN ? origin : "";
}
async function githubRequest(path, token, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tbrlucas-blog-admin",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub API error ${response.status}`);
  return data;
}
async function getSession(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const id = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const raw = await env.AUTH_KV.get("session:" + id);
  if (!raw) return null;
  return { id, ...(JSON.parse(raw)) };
}
async function readPosts(env, token) {
  const path = `/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${POSTS_PATH}?ref=main`;
  const file = await githubRequest(path, token);
  return { posts: JSON.parse(base64ToUtf8(file.content)), sha: file.sha };
}
async function writePosts(env, token, posts, sha) {
  const path = `/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${POSTS_PATH}`;
  const body = {
    message: "Manage blog publications",
    content: utf8ToBase64(JSON.stringify({ posts }, null, 2) + "\n"),
    branch: "main",
    sha
  };
  return githubRequest(path, token, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = corsOrigin(request, env);
    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status:403 });
      return new Response(null, { status:204, headers:{
        "Access-Control-Allow-Origin":origin,
        "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":"Authorization, Content-Type",
        "Access-Control-Max-Age":"86400",
        "Vary":"Origin"
      }});
    }

    try {
      if (url.pathname === "/auth/login" && request.method === "GET") {
        const state = randomToken();
        await env.AUTH_KV.put("oauth:" + state, "1", { expirationTtl:600 });
        const redirect = new URL("https://github.com/login/oauth/authorize");
        redirect.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
        redirect.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
        redirect.searchParams.set("scope", "repo");
        redirect.searchParams.set("state", state);
        return Response.redirect(redirect.toString(), 302);
      }

      if (url.pathname === "/auth/callback" && request.method === "GET") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state || await env.AUTH_KV.get("oauth:" + state) !== "1") {
          return new Response("Invalid or expired sign-in request.", {status:400});
        }
        await env.AUTH_KV.delete("oauth:" + state);
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
          method:"POST",
          headers:{"Accept":"application/json","Content-Type":"application/json"},
          body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code})
        });
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) return new Response("GitHub sign-in failed.", {status:401});
        const user = await githubRequest("/user", tokenData.access_token);
        if ((user.login || "").toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) {
          return new Response("This GitHub account is not allowed to administer this blog.", {status:403});
        }
        const sessionId = randomToken();
        await env.AUTH_KV.put("session:" + sessionId, JSON.stringify({
          token:tokenData.access_token, login:user.login
        }), {expirationTtl:604800});
        return Response.redirect(env.ADMIN_ORIGIN + ADMIN_PATH + "#session=" + sessionId, 302);
      }

      if (!origin) return json({error:"Origin not allowed."}, 403, "");
      const session = await getSession(request, env);
      if (!session) return json({error:"Please sign in again."}, 401, origin);

      if (url.pathname === "/api/session" && request.method === "GET") {
        return json({login:session.login}, 200, origin);
      }
      if (url.pathname === "/api/logout" && request.method === "POST") {
        await env.AUTH_KV.delete("session:" + session.id);
        return json({ok:true}, 200, origin);
      }
      if (url.pathname === "/api/posts" && request.method === "GET") {
        const result = await readPosts(env, session.token);
        return json({posts:result.posts.posts || []}, 200, origin);
      }
      if (url.pathname === "/api/posts" && request.method === "POST") {
        const input = await request.json();
        const result = await readPosts(env, session.token);
        let posts = Array.isArray(result.posts.posts) ? result.posts.posts : [];
        if (input.action === "save") {
          if (!validPost(input.post)) return json({error:"Check the post fields. Title, slug, date and content are required."}, 400, origin);
          const index = posts.findIndex(post => post.slug === input.post.slug);
          if (index >= 0) posts[index] = input.post;
          else {
            if (posts.length >= 100) return json({error:"The blog has reached its 100-post limit."}, 400, origin);
            posts.push(input.post);
          }
        } else if (input.action === "delete") {
          if (typeof input.slug !== "string") return json({error:"A post slug is required."}, 400, origin);
          posts = posts.filter(post => post.slug !== input.slug);
        } else {
          return json({error:"Unknown action."}, 400, origin);
        }
        await writePosts(env, session.token, posts, result.sha);
        return json({posts}, 200, origin);
      }
      return json({error:"Not found."}, 404, origin);
    } catch (error) {
      return json({error:error.message || "Unexpected server error."}, 500, origin);
    }
  }
};
