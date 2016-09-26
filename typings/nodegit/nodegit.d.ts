declare var gitClass: git.Git
declare module 'nodegit' {
  export = gitClass
}

declare module git {
  interface Git {
    Cred: Cred
    Repository: Repository
    Checkout: Checkout
    Reference: Reference
    Reset: Reset
    Signature: Signature
    Stash: Stash
    Clone(url: string, localPath: string, options?): Promise<any>
  }
  interface Cred {
    userpassPlaintextNew(username: string, password: string)
  }
  interface Repository {
    open(path: string): Promise<any>
    checkoutBranch(branch: string, { checkoutStrategy: CheckoutStrategy }): Promise<any>
    getReferences(type: ReferenceType): Promise<Array<any>>
  }
  interface Checkout {
    STRATEGY: CheckoutStrategy
  }
  interface Reference {
    TYPE: ReferenceType
  }
  interface Reset {
    reset(repo: {}, target: string, resetType: ResetType)
    TYPE: ResetType
  }
  interface Signature {
    create(name: string, email: string, time: number, offset: number)
  }
  interface Stash {
    save(repo: any, stasher: Signature, message: string, flags: number)
  }
  enum ResetType {
    SOFT = 1,
    MIXED = 2,
    HARD = 3
  }
  enum CheckoutStrategy {
    NONE = 0,
    SAFE = 1,
    FORCE = 2
  }
  enum ReferenceType {
    INVALID = 0,
    OID = 1,
    SYMBOLIC = 2,
    LISTALL = 3
  }
}
