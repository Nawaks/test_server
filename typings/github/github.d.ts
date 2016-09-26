declare var githubClass: github.Github
declare module 'github' {
  export = githubClass
}

declare module github {
  interface  Github {
    repos: repos
    pullRequests: pullRequests
    new({ version }: {
      version: string
    })
    authenticate({ type, token, key, secret }: {
      type: string
      token?: string
      key?: string
      secret?: string
    })
  }

  interface repos {
    createStatus({ user, repo, sha, state, target_url, description, context }: {
      user: string,
      repo: string,
      sha: string,
      state: State,
      target_url?: string,
      description?: string,
      context?: string
    })
    getAll({ user, repo }): {
      user: string,
      repo: string,
      visibility: Visibility,
      affiliation: Affiliation
      per_page: number
    }
  }

  interface pullRequests {
    get({ user, repo, number }: {
      user: string,
      repo: string,
      number: number
    })
  }

  export enum State {
    pending,
    success,
    error,
    failure
  }

  export enum Visibility {
    all,
    private,
    public
  }

  export enum Affiliation {
    owner,
    collaborator,
    organization_member
  }
}
