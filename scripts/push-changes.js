/* eslint-disable */

const dotenv = require('dotenv')
const shell = require('shelljs')

dotenv.config()

const GIT_USER = process.env.GIT_USER

if (!shell.which(`git`)) {
    shell.echo(`Sorry, this script requires git`)
    shell.exit(1)
}

if (
    shell.exec(`git add --all`).code +
    shell.exec(`git commit -m "updates"`).code +
    shell.exec(`git push -f origin master`).code !== 0
) {
    shell.echo(`Error: Git pushing build failed...`)
    shell.exit(1)
}

shell.echo('changes pushed successfully!')
