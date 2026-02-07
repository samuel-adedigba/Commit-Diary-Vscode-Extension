import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function checkCommit(id) {
  const { data: commit, error: commitError } = await supabase
    .from("commits")
    .select("id, user_id, message, sha, repo_id")
    .eq("id", id)
    .single();

  if (commitError) {
    console.error("Commit Error:", commitError);
  } else {
    console.log("Commit found:", commit);

    // Check the repo
    const { data: repo, error: repoError } = await supabase
      .from("repos")
      .select("id, user_id, name")
      .eq("id", commit.repo_id)
      .single();

    if (repoError) {
      console.error("Repo Error:", repoError);
    } else {
      console.log("Repo found:", repo);
    }
  }
}

checkCommit(626);
