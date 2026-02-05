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
    // AND the SHA matches the PR head SHA (user didn't override it)
    let allPRs: PR[] = []
    const prFromContext = github.context.payload.pull_request as PR | undefined
    const prHeadSha = prFromContext?.head?.sha
    
    if (prFromContext && (!sha || sha === prHeadSha || sha === github.context.sha)) {
      // Use PR from context - it's reliable and works for fork PRs
      core.info('Using PR from GitHub event context')
      allPRs = [prFromContext]
    } else {
      // Fall back to API query for other events or when SHA is explicitly different
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
