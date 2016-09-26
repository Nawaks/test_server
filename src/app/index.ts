import * as Hapi from 'hapi'
import * as Inert from 'inert'
import * as SocketIO from 'socket.io'
import * as Delivery from 'delivery'
import * as fs from 'fs'
import * as Github from 'github'
import * as Git from 'nodegit'
import * as Promise from 'bluebird'
import * as _ from 'lodash'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GIT_WORKSPACE = './.workspace'

var githubService = new Github({ version: '3.0.0' })

githubService.authenticate({
  type: 'oauth',
  token: GITHUB_TOKEN
})

let fetchOpts = {
    callbacks: {
      certificateCheck: () => 1,
      credentials: () => {
        return Git.Cred.userpassPlaintextNew(GITHUB_TOKEN, 'x-oauth-basic')
      }
    }
}

function addCommentOnPR() {

}

/**** START STATUS UPDATE */
function updatePRStatus(user: string, repo: string, sha: string, state: github.State): Promise<string> {
  const createStatus = <Function> Promise.promisify(githubService.repos.createStatus, { context: githubService })
  return createStatus({
    user: user,
    repo: repo,
    sha: sha,
    state: state,
    target_url: "https://example.com/build/status",
    description: `The build ${state}!`,
    context: "toto-integration/toto"
  })
}

function getPRHeadSha(user: string, repo: string, issue: number): Promise<string> {
  const getPullRequests = <Function> Promise.promisify(githubService.pullRequests.get, { context: githubService })
  return getPullRequests({
    user: user,
    repo: repo,
    number: issue
  })
    .then((res) => {
      return _.get(res, 'head.sha')
    })
}
/**** END STATUS UPDATE */

/**** START SCREENHOTS REPO GET */
function getScreenshotsRepoName(repo: string) {
  return `${repo}-screenshots`
}

function createScreenshotsRepo(user: string, isOrganization: boolean, repo: string, isPrivate: boolean) {
  if (isOrganization) {
    return createForOrg(user, repo, isPrivate)
  } else {
    return createRepoForUser(repo, isPrivate)
  }
}

function createRepoForUser(repo: string, isPrivate: boolean) {
  const createRepo = <Function> Promise.promisify(githubService.repos.create, { context: githubService })
  return createRepo({ name: repo })
}

function createForOrg(org: string, repo: string, isPrivate: boolean) {
  const createRepoForOrg = <Function> Promise.promisify(githubService.repos.createForOrg, { context: githubService })
  return createRepoForOrg({ org: org, name: repo })
}

function getRepo(user: string, repo: string) {
  const getRepo = <Function> Promise.promisify(githubService.repos.get, { context: githubService })
  return getRepo({
    user: user,
    repo: repo
  })
}

// @todo use search route instead? => github.search.repos({ ... });
function getScreenshotsRepo(user: string, repo: string) {
  return getRepo(user, repo)
    .then((repoDetail) => {
      const isOrganization = (_.get(repoDetail, 'owner.type') === 'Organization')
      const isPrivate = (_.get(repoDetail, 'private') === true)
      let screnshotsRepoName = getScreenshotsRepoName(repo)
      const getAllRepos = <Function> Promise.promisify(githubService.repos.getAll, { context: githubService })
      return getAllRepos({
        user: user,
        repo: repo,
        visibility: isPrivate ? 'private' : 'public',
        affiliation: isOrganization ? 'organization_member' : 'owner',
        per_page: 100
      })
        .then((res) => {
          let screenshotsRepo = _.find(res, { name: screnshotsRepoName })
          if (_.isUndefined(screenshotsRepo)) {
            return createScreenshotsRepo(user, isOrganization, screnshotsRepoName, isPrivate)
          } else {
            return screenshotsRepo
          }
        })
    })
}
/**** END SCREENHOTS REPO GET */

/**** START */
function getScreenshotsWorkspace(user: string, repo: string): Promise<any> {
  const path = `${GIT_WORKSPACE}/${user}/${repo}`
  try {
    let stats = fs.lstatSync(path)
    if (stats.isDirectory()) {
      return getWorkspace(user, repo)
    } else {
      fs.unlinkSync(path)
      return cloneRepo(user, repo)
    }
  } catch (e) {
    return cloneRepo(user, repo)
  }
}

function getWorkspace(user: string, repo: string): Promise<any> {
  const path = `${GIT_WORKSPACE}/${user}/${repo}`
  return Git.Repository.open(path)
}

function cloneRepo(user: string, repo: string): Promise<any> {
  let repoUrl: string = getRepoUrl(user, repo)
  return Git.Clone(repoUrl, `${GIT_WORKSPACE}/${user}/${repo}`, { fetchOpts: fetchOpts })
}

function getRepoUrl(user: string, repo: string): string {
  return `https://${GITHUB_TOKEN}:-oauth-basic@github.com/${user}/${repo}.git`
}

const server = new Hapi.Server()

server.connection({
  host: 'localhost',
  port: 3000
})

const io = SocketIO.listen(3001)
// const io = SocketIO(server.listener)
io.sockets.on('connection', (socket) => {
  console.log('Socket connected: Listening')

  socket.on('error', (err) => {
    console.error(err)
  })

  const delivery = Delivery.listen(socket)
  delivery.on('receive.success', (file) => {
    fs.writeFile(file.name, file.buffer, (err) => {
      if (err) {
        console.log('File could not be saved: ' + err)
      } else {
        console.log('File ' + file.name + " saved")
      }
    })
  })

  socket.emit('connected')
})

server.route({
  method: 'GET',
  path: '/sample',
  handler: function (request, reply) {
    reply.file(__dirname + '/../../public/index.html')
  }
})

server.route({
  method: 'GET',
  path: '/validate',
  handler: function (request, reply) {
    reply('VALIDATE!')
  }
})

// http://localhost:3000/update?user=yannickglt&repo=github-api-test&issue=1&state=success
server.route({
  method: 'GET',
  path: '/update',
  handler: (request, reply) => {
    getPRHeadSha(request.query.user, request.query.repo, request.query.issue)
      .then((sha) => {
        return updatePRStatus(request.query.user, request.query.repo, sha, request.query.state)
      })
      .then(() => {
        reply(`Pull-request ${request.query.user}/${request.query.repo}/${request.query.issue} updated with status "${request.query.state}" successfully`)
      }, (err) => {
        reply(`ERROR: Status ${err.code} - ${err.message}`);
      })
  }
})

// http://localhost:3000/screenshots-repo?user=yannickglt&repo=github-api-test
server.route({
  method: 'GET',
  path: '/screenshots-repo',
  handler: (request, reply) => {
    getScreenshotsRepo(request.query.user, request.query.repo)
      .then((repo) => {
        reply(repo)
      }, (err) => {
        reply(`ERROR: Status ${err.code} - ${err.message}`);
      })
  }
})

function isCleanRepository(repo): Promise<boolean> {
  return repo.getReferences(3)
    .then((references) => {
      return _.isEmpty(references) ? false : true
    }, () => {
      return false
    })
}

function createCommit(repo, treeId) {
  const time = new Date().getTime()
  const offset = 0
  const author = Git.Signature.create('Yannick Galatol', 'yannick.galatol@gmail.com', time, offset)
  const committer = Git.Signature.create('Yannick Galatol', 'yannickglt@github.com', time, offset)
  console.log('createCommit')
  return repo.createCommit('HEAD', author, committer, 'message', treeId, [])
}

function getTreeId(repo) {
  let index
  return repo.refreshIndex()
  .then(function(idx) {
    index = idx;
  })
  .then(function() {
    return index.write()
  })
  .then(function() {
    return index.writeTree()
  })
}

function getCommit(repo) {
  console.log('getCommit');
  return repo
    .getHeadCommit()
    .then((commit) => {
      if (!_.isNull(commit)) {
        return commit.id
      } else {
        return getTreeId(repo)
          .then((treeId) => {
            return createCommit(repo, treeId)
          })
      }
    })
}

function checkoutBranch(repo, branch): Promise<any> {
  return getCurrentBranchName(repo)
    .then((branchName) => {
      if (branchName !== branch) {
        return repo
          .checkoutBranch(branch, {
            checkoutStrategy: 2
          })
          .catch(() => {
            console.log('createBranch')
            return getCommit(repo)
              .then((commitId) => {
                return repo.createBranch(branch, commitId, true, repo.defaultSignature(), `Created ${branch} on HEAD`)
              })
          })
      }
    })
}

function getCurrentBranchName(repo) {
  console.log('getCurrentBranch')
  return repo.getCurrentBranch()
    .then((reference) => {
      return reference.shorthand()
    })
}

server.route({
  method: 'GET',
  path: '/clone-repo',
  handler: (request, reply) => {

    let repo
    let isCleanRepo
    let index
    let treeId
    let commitId

    getScreenshotsWorkspace(request.query.user, request.query.repo)
      .then((repository) => {
        repo = repository
      })
      .then(() => {
        return repo.fetchAll(fetchOpts).then(() => repo)
      })
      // .then(() => {
      //   console.log('isCleanRepository')
      //   return isCleanRepository(repo)
      // })
      // .then((isClean) => {
      //   isCleanRepo = isClean
      // })
      .then(() => {
        return getCommit(repo)
      })
      .then(() => {
        return checkoutBranch(repo, request.query.branch)
      })
      .then(() => {
        return repo
          .getHeadCommit()
          .then((commitId) => {
            console.log('reset')
            return Git.Reset.reset(repo, commitId, 3)
          })
      })
      .then(() => {
        const time = new Date().getTime()
        const offset = 0
        const stasher = Git.Signature.create('Yannick Galatol', 'yannick.galatol@gmail.com', time, offset)
        return Git.Stash.save(repo, stasher, `Uncommitted changes before Checkout at ${time}`, 6)
      })
      .then(() => {
        console.log(repo);
        reply(repo)
      }, (err) => {
        console.error(err)
      })
  }
})

server.route({
  method: 'GET',
  path: '/comment',
  handler: function (request, reply) {
    addCommentOnPR()
    reply('COMMENTED!')
  }
})

server.route({
  method: 'GET',
  path: '/invalidate',
  handler: (request, reply) => {
    reply('INVALIDATE!')
  }
})

server.route({
  method: 'POST',
  path: '/upload',
  handler: (request, reply) => {
    var data = request.payload;
    if (data.file) {
      var name = data.file.hapi.filename;
      var path = __dirname + '/uploads/' + name;
      var file = fs.createWriteStream(path);

      file.on('error', function (err) {
        console.error(err)
      });

      data.file.pipe(file);

      data.file.on('end', function (err) {
        var ret = {
          filename: data.file.hapi.filename,
          headers: data.file.hapi.headers
        }
        reply(JSON.stringify(ret));
      })
    }
  },
  config: {
    payload: {
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data'
    }
  }
})

// Start the server
server.start((err) => {
  if (err) throw err
  console.log(`Server running at: ${server.info.uri}`)
})

server.register(Inert, (err) => {
  if (err) {
    throw err
  }
})
