export function isInstitutionalEmail(email: string) {
  const allowedDomains = [
    "galgotiasuniversity.ac.in",
    "galgotiasuniversity.edu.in",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}
