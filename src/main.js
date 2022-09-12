/*!
 * Handy Bookmarks Manager
 *
 * Browser Extension for managing bookmarks
 * https://github.com/Handy-Bookmarks-Manager/hbm-ff
 *
 * Released under the GNU General Public License v3.0 license
 * https://github.com/Handy-Bookmarks-Manager/hbm-ff/blob/main/LICENSE
 *
 * @version 1.0.0
 * @date 2022-09-08T05:15:46.440Z
 */
import jQuery from 'jquery'
import 'jquery-ui-dist/jquery-ui'
import { getFileStorage } from 'idb-file-storage/src/idb-file-storage.js'
import { initMainTree } from './utils/tree'
import widgets from './utils/widgets.js'
import { getOrigin, getStatusText } from './utils/text'
import { getNiceDate } from './utils/time'
import { getTree } from 'jquery.fancytree'

// vars for widgets
export let add_bm_dialog,
    fetch_progress,
    delete_bm_dialog,
    delete_bm_dialog_context,
    add_folder_dialog,
    message_dialog,
    error_dialog,
    settings_dialog,
    edit_bm_dialog

// vars for data
export let bookmarks, favicons, serverStatus, faviconList, settings
export const objectURL = {}

jQuery(function ($) {
    // functions

    async function getServerStatus() {
        fetch_progress.dialog('open')

        const checkedNodes = getTree('#bookmarks-table').getSelectedNodes()
        for (const node of checkedNodes) {
            if (!node.folder) {
                try {
                    const response = await fetch(node.data.url, {
                        method: 'HEAD',
                        cache: 'no-cache',
                    })
                    const headers = response.headers
                    if (response.status === 404 || response.status === 405) {
                        const response = await fetch(node.data.url, {
                            method: 'GET',
                            cache: 'no-cache',
                        })
                        const headers = response.headers
                        serverStatus[node.data.id] = {
                            statusText: response.statusText
                                ? response.statusText
                                : getStatusText(response.status),
                            lastModified: headers.get('last-modified')
                                ? getNiceDate(headers.get('last-modified'))
                                : 'Not available',
                        }
                    } else {
                        serverStatus[node.data.id] = {
                            statusText: response.statusText
                                ? response.statusText
                                : getStatusText(response.status),
                            lastModified: headers.get('last-modified')
                                ? getNiceDate(headers.get('last-modified'))
                                : 'Not available',
                        }
                    }
                } catch (e) {
                    //FIXME: e.message = "NetworkError when attempting to fetch resource."
                    // due to unsupported method, server not available, CORS, ...
                    console.error(e, node.data.url)
                    serverStatus[node.data.id] = {
                        statusText: 'Failed',
                        lastModified: 'Not available',
                    }
                }
            }
        }
        await browser.storage.local.set({ serverStatus })
        browser.tabs.reload()
        fetch_progress.dialog('close')
        // TODO: sync expander
        // FIXME: checkbox not showing
    }
    async function getFavicons() {
        fetch_progress.dialog('open')

        const newfaviconList = []
        const failedFetchList = []
        const checkedNodes = getTree('#bookmarks-table').getSelectedNodes()

        for (const node of checkedNodes) {
            if (!node.folder) {
                try {
                    const origin = getOrigin(node.data.url)
                    if (
                        origin &&
                        !newfaviconList.includes(origin) &&
                        !failedFetchList.includes(origin)
                    ) {
                        let url

                        if (
                            settings.faviconSrc &&
                            settings.faviconSrc === 'Google'
                        ) {
                            url = `http://www.google.com/s2/favicons?domain=${origin}`
                        } else {
                            url = `${origin}/favicon.ico`
                        }
                        const response = await fetch(url)
                        if (response.status >= 200 && response.status < 400) {
                            const blob = await response.blob()
                            await favicons.put(origin, blob)
                            newfaviconList.push(origin)
                        } else {
                            failedFetchList.push(origin)
                        }
                    }
                } catch (e) {
                    failedFetchList.push(origin)
                    console.error(e, node.data.url)
                }
            }
        }
        faviconList = [...faviconList, ...newfaviconList]
        await browser.storage.local.set({ faviconList })
        fetch_progress.dialog('close')
        browser.tabs.reload()
    }

    async function clearExtData() {
        await browser.storage.local.clear()
        await favicons.clear()
        window.localStorage.clear()
        browser.tabs.reload()
    }

    async function getTitle() {
        fetch_progress.dialog('open')

        const checkedNodes = getTree('#bookmarks-table').getSelectedNodes()
        for (const node of checkedNodes) {
            if (!node.folder) {
                try {
                    let url
                    let title
                    if (
                        settings.titleSrc &&
                        settings.titleSrc === 'textance.herokuapp.com'
                    ) {
                        url = `http://textance.herokuapp.com/title/${node.data.url}`
                        const response = await fetch(url, {
                            method: 'GET',
                        })
                        if (response.status === 200) {
                            title = await response.text()
                        } else {
                            title = ''
                        }
                    } else {
                        url = node.data.url
                        const response = await fetch(url, {
                            method: 'GET',
                        })
                        const html = await response.text()
                        title = $(html).filter('title').text()
                    }
                    if (title) {
                        await browser.bookmarks.update(node.data.id, {
                            title,
                        })
                    }
                } catch (e) {
                    console.error(e, node.data.url)
                }
            }
        }
        fetch_progress.dialog('close')
        browser.tabs.reload()
    }

    function applyFilter(e) {
        const filter = $('#filter-type option:selected').text()
        const bookmarksTable = getTree('#bookmarks-table')
        switch (filter) {
            case 'None':
                browser.tabs.reload()
                break
            case '404 pages':
                bookmarksTable.filterNodes(
                    function (node) {
                        return serverStatus[node.data.id]
                            ? serverStatus[node.data.id]['statusText'] ===
                                  'Not Found'
                            : false
                    },
                    { autoExpand: true, leavesOnly: true }
                )
                break
            case 'Added last week':
                bookmarksTable.filterNodes(
                    function (node) {
                        return (
                            node.data.dateAdded >
                            new Date().getTime() - 1000 * 60 * 60 * 24 * 7
                        )
                    },
                    { autoExpand: true, leavesOnly: true }
                )

                break
            case 'Duplicate items':
                const duplicates = []
                const visited = []
                bookmarksTable.visit(function (node) {
                    if (!node.folder) {
                        const url = node.data.url
                        if (
                            !duplicates.includes(url) &&
                            visited.includes(url)
                        ) {
                            duplicates.push(url)
                        } else {
                            visited.push(url)
                        }
                    }
                })

                bookmarksTable.filterNodes(
                    function (node) {
                        return duplicates.includes(node.data.url)
                    },
                    { autoExpand: true, leavesOnly: true }
                )
                break
        }
    }

    // click handlers

    $('#get-server-status').on('click', getServerStatus)
    $('#get-favicons').on('click', getFavicons)
    $('#clear-ext-data').on('click', clearExtData)
    $('#get-title').on('click', getTitle)
    $('#filter-control button').on('click', applyFilter)

    $('#add').on('click', function () {
        add_bm_dialog.dialog('open')
    })

    $('#delete').on('click', function () {
        delete_bm_dialog.dialog('open')
    })

    $('#expander').on('click', function (e) {
        // FIXME: checkboxes are not showing
        const expand = $(this)
        const tree = getTree('#bookmarks-table')
        tree.expandAll(true)

        if (expand.hasClass('expanded')) {
            tree.expandAll(false)
            expand.toggleClass('expanded')
            expand.text('Expand all')
        } else {
            tree.expandAll(true)
            expand.text('Collapse all')
            expand.toggleClass('expanded')
        }
    })

    $('#search').on('keyup', function (e) {
        getTree('#bookmarks-table').filterNodes(
            function (node) {
                const regex = new RegExp(e.target.value, 'i')
                return regex.test(node.title) || regex.test(node.data.url)
            },
            { autoExpand: true, leavesOnly: true }
        )
    })

    $('#clear-search').on('click', function () {
        if ($('#search').val()) {
            getTree('#bookmarks-table').clearFilter()
            $('#search').val('')
        }
    })
    $('#settings').on('click', function () {
        settings_dialog.dialog('open')
    })

    async function main() {
        bookmarks = (await browser.bookmarks.getTree())[0]
        favicons = await getFileStorage({ name: 'favicons' })
        const db = await browser.storage.local.get()
        serverStatus = db['serverStatus'] ? db['serverStatus'] : {}
        faviconList = db['faviconList'] ? db['faviconList'] : []
        settings = db['settings'] ? db['settings'] : {}

        initMainTree(bookmarks)

        // widgets initialization

        fetch_progress = widgets.init('#fetch-progress')
        add_bm_dialog = widgets.init('#add-bm-dialog')
        delete_bm_dialog = widgets.init('#delete-bm-dialog')
        delete_bm_dialog_context = widgets.init('#delete-bm-dialog-context')
        add_folder_dialog = widgets.init('#add-folder-dialog')
        message_dialog = widgets.init('#message-dialog')
        error_dialog = widgets.init('#error-dialog')
        settings_dialog = widgets.init('#settings-dialog')
        edit_bm_dialog = widgets.init('#edit-bm-dialog')
        widgets.init('.select-menu')
        widgets.init('.controlgroup')
    }

    main().then(() => $('body').show())
})
