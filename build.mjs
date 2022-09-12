import webExt from 'web-ext'

webExt.cmd
    .lint(
        {
            sourceDir: 'extension',
        },
        {
            shouldExitProgram: false,
        }
    )
    .then(() => {
        webExt.cmd
            .build({
                sourceDir: 'extension',
                artifactsDir: 'build',
                overwriteDest: true,
                ignoreFiles: ['main/main.js.map'],
            })
            .then((results) => {
                console.log(results)
            })
    })
    .catch((e) => console.error(e))
