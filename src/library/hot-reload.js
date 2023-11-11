/**
 * Hot reloads the chrome-extension so you don't have to reload it manually each time.
 * Doesn't work at the moment, see Todo: that was added below.
 */
const filesInDirectory = dir => new Promise (resolve =>
    dir.createReader ().readEntries (entries =>
        Promise.all (entries.filter (e => e.name[0] !== '.').map (e =>
            e.isDirectory
                ? filesInDirectory (e)
                : new Promise (resolve => e.file (resolve))
        ))
        .then (files => [].concat (...files))
        .then (resolve)
    )
)

const timestampForFilesInDirectory = dir =>
        filesInDirectory (dir).then (files =>
            files.map (f => f.name + f.lastModifiedDate).join ())

const watchChanges = (dir, lastTimestamp) => {
    timestampForFilesInDirectory (dir).then (timestamp => {
        if (!lastTimestamp || (lastTimestamp === timestamp)) {
            setTimeout (() => watchChanges (dir, timestamp), 1000) // retry after 1s
        } else {
            chrome.runtime.reload ()
        }
    })
}

chrome.management.getSelf (self => {
    if (self.installType === 'development') {
        /**
         * Todo: getPackageDirectoryEntry does not work in background on manifest v3. 
         * Not a big deal when using the launch.json config since it's reinstalled each time
         * Relevant Links:
         * https://developer.chrome.com/docs/extensions/reference/runtime/#method-getPackageDirectoryEntry
         * https://stackoverflow.com/questions/71377847/cant-use-chrome-runtime-getpackagedirectoryentry-in-service-work-with-the-manif
         */
        chrome.runtime.getPackageDirectoryEntry(dir => watchChanges (dir))
        chrome.tabs.query ({ active: true, lastFocusedWindow: true }, tabs => { // NB: see https://github.com/xpl/crx-hotreload/issues/5
            if (tabs[0]) {
                chrome.tabs.reload (tabs[0].id)
            }
        })
    }
})