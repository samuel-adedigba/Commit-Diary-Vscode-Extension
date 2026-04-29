export function validateRepoIdParam(req, res, next) {
  const parsedRepoId = parseInt(req.params.repoId, 10);
  if (Number.isNaN(parsedRepoId)) {
    return res.status(400).json({ error: "Invalid repoId" });
  }
  req.params.repoId = String(parsedRepoId);
  next();
}

export function validateCommitIdParam(req, res, next) {
  const parsedCommitId = parseInt(req.params.commitId, 10);
  if (Number.isNaN(parsedCommitId)) {
    return res.status(400).json({ error: "Invalid commitId" });
  }
  req.params.commitId = String(parsedCommitId);
  next();
}

export function validateToggleReportsBody(req, res, next) {
  if (typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ error: "enabled must be a boolean" });
  }
  next();
}

export function validateJobIdParam(req, res, next) {
  const { jobId } = req.params;
  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ error: "Invalid jobId" });
  }
  next();
}
