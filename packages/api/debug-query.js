import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function testQuery(commitId, userId) {
  const { data, error } = await supabase
    .from("commits")
    .select(
      `
      id,
      sha,
      message,
      author_name,
      files,
      components,
      diff_summary,
      repo_id,
      repos(name, remote)
    `,
    )
    .eq("id", commitId)
    .eq("user_id", userId)
    .single();

  if (error) {
  } else {
  }
}

testQuery(626, "ffc8e661-b84b-4ac2-a0da-8bd265e406bc");
