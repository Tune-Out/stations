<!--
  Thank you for contributing to Tune Out's public catalog.

  This template lives in the catalog repository as a working copy. The version
  that actually appears when contributors open a pull request is the one in
  the data repository at https://github.com/Tune-Out/stations/.github/pull_request_template.md
  — keep the two in sync.

  Please fill in every section. The "Authorization" block at the bottom is
  required; PRs that leave it unchecked may be closed without merging.
-->

## What kind of change is this?

<!-- Check ONE. -->

- [ ] **Update** existing station metadata (name, tags, language, URL, etc.)
- [ ] **Add** a new station to the catalog
- [ ] **Correct** a factual error (wrong country, mis-attributed operator, typo)
- [ ] **Remove** a station (no longer broadcasting, gone offline permanently)
- [ ] **Update the research/background block** (`research:` in the YAML)
- [ ] Other (please describe in the *Description* section)

## Station

| Field | Value |
| --- | --- |
| Station name | <!-- e.g. Radio Paradise --> |
| Station UUID | <!-- visible in the URL of the station's page on tune-out.app — looks like `9617a958-0601-11e8-ae97-52543be04c81` --> |
| Country | <!-- e.g. United States --> |
| Public homepage URL | <!-- e.g. https://radioparadise.com --> |

(If you are **adding** a new station, leave UUID blank — one will be generated for you on merge.)

## Description

<!-- What is changing and why? Include the previous value AND the new value
     where applicable, so the maintainer can verify each field. Example:

     • country was "United Kingdom Of Great Britain And Northern Ireland",
       changed to "United Kingdom" — matches ISO 3166 short form.
     • tags added "lo-fi" because the format shifted last quarter.
-->

## Sources

<!-- At least one verifiable source is required. Examples:
     • The station's official homepage URL
     • An official social media account (the official one — not fan accounts)
     • A regulatory filing (FCC public file, Ofcom register, etc.)
     • A press release from the station's parent company
     • "Internal knowledge — I work for the station" (then check the
       appropriate box in "About you" below)
-->

1.
2.

## About you

**Name or handle** (or write "anonymous"):

**Your relationship to the station** — pick the closest:

- [ ] I am the **station owner, manager, or employee**
- [ ] I am a **volunteer / community broadcaster** at the station
- [ ] I work for the station's **parent organization or licensee**
- [ ] I am a **listener** correcting publicly visible information
- [ ] I am a **journalist, researcher, or industry analyst**
- [ ] Other (please describe):

**Contact (optional)** — only if you'd like to be reachable for questions about this submission. We will never publish contact information from this PR. (Email, social handle, or "no contact required":)

## Authorization

<!-- This is a non-commercial, CC0 public-domain catalog. We publish only
     publicly visible station metadata (call sign, frequency, broadcast
     country, programming format, etc.) — never private business data, never
     personal contact info, never undisclosed ownership. -->

Please tick all that apply:

- [ ] The information I am providing is **already public** (visible on the station's official website, a regulatory database, a press release, or similar publicly accessible source).
- [ ] If I am submitting **non-public information** (e.g. internal-knowledge claims), I confirm that I am **authorized** by the station to release it under CC0.
- [ ] I have **not** included private contact details (personal phone numbers, home addresses, undisclosed personnel names).
- [ ] I understand that the entire catalog — including this contribution — is published under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), and that my contribution becomes part of the public domain.
- [ ] I have read the existing `data/stations/<shard>/<uuid>.yaml` file format and my YAML still parses (or I have only used the GitHub web editor and trust the maintainers to verify).

## Anything else?

<!-- Optional — anything the maintainers should know. Edge cases, related
     stations, dependent changes in other repos, etc. -->
