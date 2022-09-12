import $ from 'jquery'
import 'jquery.fancytree/dist/skin-win7/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-awesome/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-bootstrap/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-bootstrap-n/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-lion/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-material/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-vista/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-win8/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-win8-n/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-win8-xxl/ui.fancytree.css'
// import 'jquery.fancytree/dist/skin-xp/ui.fancytree.css'

import 'ui-contextmenu/jquery.ui-contextmenu'
import 'jquery.fancytree/dist/modules/jquery.fancytree.edit'
import 'jquery.fancytree/dist/modules/jquery.fancytree.filter'
import 'jquery.fancytree/dist/modules/jquery.fancytree.table'
import 'jquery.fancytree/dist/modules/jquery.fancytree.childcounter'
import 'jquery.fancytree/dist/modules/jquery.fancytree.persist'
import { createTree } from 'jquery.fancytree'
import { getNiceDate } from './time'
import {
    add_bm_dialog,
    add_folder_dialog,
    delete_bm_dialog_context,
    edit_bm_dialog,
    faviconList,
    favicons,
    fetch_progress,
    objectURL,
    serverStatus,
} from '../main'
import { getOrigin, startsWith } from './text'

export function initAddTree(source) {
    createTree('#add-bm-tree', {
        source,
        extensions: ['filter'],
        selectMode: 1,
        autoCollapse: true,
        filter: {
            mode: 'hide',
            counter: false,
        },
        icon: function (e, data) {
            return (data.node.folder = true)
        },
        activate: function (e, data) {
            $('#add-bm-accordion h4').text(data.node.title)
            $('#add-bm-accordion').attr('selected-location', data.node.data.id)
        },
    }).filterNodes(
        function (node) {
            return node.type === 'folder'
        },
        { autoExpand: true }
    )
}

export function initEditTree(source) {
    createTree('#edit-bm-tree', {
        source,
        extensions: ['filter'],
        selectMode: 1,
        autoCollapse: true,
        filter: {
            mode: 'hide',
            counter: false,
        },
        icon: function (e, data) {
            return (data.node.folder = true)
        },
        activate: function (e, data) {
            $('#edit-bm-accordion h4').text(data.node.title)
            $('#edit-bm-accordion').attr('selected-location', data.node.data.id)
        },
    }).filterNodes(
        function (node) {
            return node.type === 'folder'
        },
        { autoExpand: true }
    )
}

export function initMainTree(source) {
    createTree('#bookmarks-table', {
        source,
        extensions: ['table', 'childcounter', 'edit', 'persist', 'filter'],
        checkbox: true,
        selectMode: 3,
        quicksearch: true,

        filter: {
            counter: false,
            mode: 'hide',
        },

        persist: {
            store: 'local',
            types: 'expanded selected',
        },

        table: {
            indentation: 20,
            nodeColumnIdx: 2,
            checkboxColumnIdx: 0,
        },
        childcounter: {
            deep: true,
            hideZeros: true,
            hideExpanded: true,
        },

        edit: {
            triggerStart: ['f2', 'shift+click', 'mac+enter'],
            beforeEdit: function (event, data) {
                if (data.node.data.parentId === 'root________') {
                    // TODO: notify user -  "The bookmark root cannot be modified"
                    return false
                }
            },
            close: async function (e, data) {
                if (data.save) {
                    await browser.bookmarks.update(data.node.data.id, {
                        title: data.node.title,
                    })
                }
            },
        },
        icon: function (e, data) {
            if (data.node.type === 'folder') {
                data.node.folder = true
                return true
            }
        },

        renderColumns: async function (event, data) {
            let tdList = $(data.node.tr).find('>td')
            $(tdList).eq(1).text(data.node.getIndexHier())
            $(tdList).eq(3).text(data.node.data.url)

            $(tdList)
                .eq(3)
                .html(function () {
                    if (!data.node.folder) {
                        return `<a href='${data.node.data.url}' target='_blank'>${data.node.data.url}</a>`
                    }
                })
            $(tdList).eq(4).text(getNiceDate(data.node.data.dateAdded))

            $(tdList)
                .eq(5)
                .text(function () {
                    const id = data.node.data.id
                    if (serverStatus && serverStatus[id]) {
                        return serverStatus[id]['statusText']
                    }
                })
            $(tdList)
                .eq(6)
                .text(function () {
                    const id = data.node.data.id
                    if (serverStatus && serverStatus[id]) {
                        return serverStatus[id]['lastModified']
                    }
                })

            const origin = getOrigin(data.node.data.url)

            if (faviconList.includes(origin)) {
                let faviconSRC
                const favicon = $(tdList)
                    .eq(2)
                    .find("span[role='presentation']")
                    .removeClass('fancytree-icon')

                if (Object.keys(objectURL).includes(origin)) {
                    // already ObjectURL created
                    faviconSRC = objectURL[origin]
                    favicon.html(
                        `<img src="${faviconSRC}" style="margin-left:4px;width:16px" />`
                    )
                } else {
                    faviconSRC = await favicons.get(origin)
                    if (
                        faviconSRC.size > 0 &&
                        startsWith(faviconSRC.type, 'image', 0)
                    ) {
                        const src = URL.createObjectURL(faviconSRC)
                        favicon.append(
                            `<img src="${src}" style="margin-left:4px;width:16px" />`
                        )
                        objectURL[origin] = src
                    }
                }
            }
        },
    })

    $('#bookmarks-table').on('nodeCommand', function (event, data) {
        var tree = $.ui.fancytree.getTree(this),
            node = tree.getActiveNode()

        switch (data.cmd) {
            case 'open':
                // TODO: handle unqualified urls
                const urls = getAllURL(node)
                urls.forEach((url) => {
                    browser.tabs.create({ url, active: false })
                })
                break
            case 'remove':
                delete_bm_dialog_context
                    .dialog({
                        buttons: {
                            Yes: async function () {
                                if (!!node.folder) {
                                    if (node.data.parentId === 'root________') {
                                        // TODO: notify user -  "The bookmark root cannot be modified"
                                        return
                                    }
                                    $(this).dialog('close')
                                    fetch_progress.dialog('open')
                                    await browser.bookmarks
                                        .removeTree(node.data.id)
                                        .then(() => {
                                            tree.applyCommand(data.cmd, node)
                                        })
                                } else {
                                    $(this).dialog('close')
                                    fetch_progress.dialog('open')
                                    await browser.bookmarks
                                        .remove(node.data.id)
                                        .then(() => {
                                            tree.applyCommand(data.cmd, node)
                                        })
                                }
                                fetch_progress.dialog('close')
                            },
                            No: function () {
                                $(this).dialog('close')
                            },
                        },
                    })
                    .dialog('open')
                break
            case 'new-folder':
                add_folder_dialog
                    .dialog({
                        open: true,
                        buttons: {
                            Add: async function () {
                                browser.bookmarks
                                    .create({
                                        title: $('#add-folder-name').val(),
                                        parentId: node.data.id,
                                    })
                                    .then(function (bm) {
                                        node.addNode({
                                            title: $('#add-folder-name').val(),
                                            folder: true,
                                            data: {
                                                dateAdded: new Date(),
                                                id: bm.id,
                                            },
                                        }).setActive()
                                        $('#add-folder-name').val('')
                                    })
                                $(this).dialog('close')
                            },
                            Cancel: function () {
                                $('#folder-name').val('')
                                $(this).dialog('close')
                            },
                        },
                    })
                    .dialog('open')

                break
            case 'new-bookmark':
                $('#add-bm-accordion h4').text(node.title)
                $('#add-bm-accordion').attr('selected-location', node.data.id)
                add_bm_dialog.dialog('open')
                break
            case 'rename':
                if (!node.folder) {
                    edit_bm_dialog
                        .dialog({
                            open: async function () {
                                $('#edit-bm-error').hide()
                                initEditTree(
                                    (await browser.bookmarks.getTree())[0]
                                )
                                $('#edit-bm-dialog #name').val(node.title)
                                $('#edit-bm-dialog #url').val(node.data.url)
                                $('#edit-bm-accordion h4').text(
                                    node.parent.title
                                )
                                $('#edit-bm-accordion').attr(
                                    'selected-location',
                                    node.parent.data.id
                                )
                            },
                            buttons: {
                                Edit: async function () {
                                    $('#edit-bm-error').hide()

                                    let newBM = {
                                        title: $('#edit-bm-dialog #name').val(),
                                        url: $('#edit-bm-dialog #url').val(),
                                    }

                                    try {
                                        await browser.bookmarks.update(
                                            node.data.id,
                                            newBM
                                        )
                                        if (
                                            $('#edit-bm-accordion').attr(
                                                'selected-location'
                                            ) !== node.parent.data.id
                                        ) {
                                            await browser.bookmarks.move(
                                                node.data.id,
                                                {
                                                    parentId:
                                                        $(
                                                            '#edit-bm-accordion'
                                                        ).attr(
                                                            'selected-location'
                                                        ),
                                                }
                                            )
                                        }
                                        $(this).dialog('close')
                                    } catch (e) {
                                        $('#edit-bm-error-msg').text(
                                            'Invalid bookmark'
                                        )
                                        $('#edit-bm-error').show()
                                    }
                                },

                                Cancel: function () {
                                    $(this).dialog('close')
                                },
                            },
                        })
                        .dialog('open')
                } else {
                    tree.applyCommand(data.cmd, node)
                }
                break
            // case 'indent':
            // case 'moveDown':
            // case 'moveUp':
            // case 'outdent':
            //     tree.applyCommand(data.cmd, node)
            //     break

            // case 'cut':
            //     CLIPBOARD = { mode: data.cmd, data: node }
            //     break

            // case 'paste':
            //     if (CLIPBOARD.mode === 'cut') {
            //         // refNode = node.getPrevSibling();
            //         CLIPBOARD.data.moveTo(node, 'child')
            //         CLIPBOARD.data.setActive()
            //     } else if (CLIPBOARD.mode === 'copy') {
            //         node.addChildren(CLIPBOARD.data).setActive()
            //     }
            //     break
        }
    })

    $('#bookmarks-table').contextmenu({
        delegate: 'tr',
        menu: [
            {
                title: 'Open',
                cmd: 'open',
                uiIcon: '	ui-icon-extlink',
            },
            { title: '----' },
            {
                // title: "Edit <kbd>[F2]</kbd>",
                title: 'Edit',
                cmd: 'rename',
                uiIcon: 'ui-icon-pencil',
            },
            // {
            //   // title: "Cut <kbd>Ctrl+X</kbd>",
            //   cmd: "cut",
            //   uiIcon: "ui-icon-scissors",
            // },
            {
                // title: "Delete <kbd>[Del]</kbd>",
                title: 'Delete',
                cmd: 'remove',
                uiIcon: 'ui-icon-trash',
            },
            { title: '----' },
            {
                // title: "New folder <kbd>[Ctrl+Shift+N]</kbd>",
                title: 'New folder',
                cmd: 'new-folder',
                uiIcon: 'ui-icon-folder-collapsed',
            },
            {
                // title: "New bookmark <kbd>[Ctrl+Shift+N]</kbd>",
                title: 'New bookmark',
                cmd: 'new-bookmark',
                uiIcon: 'ui-icon-star',
            },
        ],
        beforeOpen: function (event, ui) {
            var node = $.ui.fancytree.getNode(ui.target)
            if (node.folder) {
                $('#bookmarks-table').contextmenu(
                    'setTitle',
                    'open',
                    'Open all'
                )
                $('#bookmarks-table').contextmenu(
                    'enableEntry',
                    'new-bookmark',
                    true
                )
                $('#bookmarks-table').contextmenu(
                    'enableEntry',
                    'new-folder',
                    true
                )
            } else {
                $('#bookmarks-table').contextmenu('setTitle', 'open', 'Open')
                $('#bookmarks-table').contextmenu(
                    'enableEntry',
                    'new-folder',
                    false
                )
                $('#bookmarks-table').contextmenu(
                    'enableEntry',
                    'new-bookmark',
                    false
                )
            }
            node.setActive()
        },
        select: function (event, ui) {
            var that = this
            setTimeout(function () {
                $(that).trigger('nodeCommand', { cmd: ui.cmd })
            }, 100)
        },
    })
}

export function getAllURL(tree) {
    const urls = []
    if (Array.isArray(tree.children)) {
        tree.children.forEach((child) => {
            if (Array.isArray(child.children)) {
                urls.push(...getAllURL(child))
            } else {
                urls.push(child.data.url)
            }
        })
    } else {
        urls.push(tree.data.url)
    }

    return urls
}
