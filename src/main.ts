import * as core from '@actions/core'
import * as github from '@actions/github'
import getInputs from './io/get-inputs'
import getLastPullRequest from './get-last-pr'
import getPRsAssociatedWithCommit from './adapter/get-prs-associated-with-commit'
import setOutput from './io/set-output'
import {PR} from './types/pull-request'

async function main(): Promise<void> {
  try {
    const {token, sha, filterOutClosed, filterOutDraft} = getInputs()

    const octokit = github.getOctokit(token)
    
    // Check if we're in a pull_request or pull_request_target event
    // If so, use the PR from context directly as it's more reliable
    let allPRs: PR[] = []
    if (github.context.payload.pull_request) {
      core.info('Using PR from GitHub event context')
      allPRs = [github.context.payload.pull_request as PR]
    } else {
      // Fall back to API query for other events (e.g., push)
      core.info('Querying API for PRs associated with commit')
      allPRs = await getPRsAssociatedWithCommit(octokit, sha)
    }

    const pr = getLastPullRequest(allPRs, {
      draft: !filterOutDraft,
      closed: !filterOutClosed,
      preferWithHeadSha: sha
    })

    setOutput(pr)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

main()
