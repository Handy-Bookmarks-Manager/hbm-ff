import $ from 'jquery'
import { getTree } from 'jquery.fancytree'
import { fetch_progress, settings } from '../main'
import { isValidUrl, splitByWhiteSpaces } from './text'
import { initAddTree } from './tree'

const widgets = {
    init: function (id) {
        switch (id) {
            case '#delete-bm-dialog':
                return $(id).dialog({
                    autoOpen: false,
                    resizable: false,
                    height: 'auto',
                    width: 400,
                    modal: true,
                    buttons: {
                        Yes: async function () {
                            $(this).dialog('close')
                            fetch_progress.dialog('open')
                            const tree = getTree('#bookmarks-table')
                            const checkedNodes = tree.getSelectedNodes()

                            for (const node of checkedNodes) {
                                try {
                                    if (node.parent && node.type === 'folder') {
                                        await browser.bookmarks.removeTree(
                                            node.data.id
                                        )
                                        tree.applyCommand('remove', node)
                                    }
                                    if (
                                        node.parent &&
                                        node.type === 'bookmark'
                                    ) {
                                        await browser.bookmarks.remove(
                                            node.data.id
                                        )
                                        tree.applyCommand('remove', node)
                                    }
                                } catch (e) {
                                    console.error(e)
                                }
                            }
                            fetch_progress.dialog('close')
                        },
                        No: function () {
                            $(this).dialog('close')
                        },
                    },
                })
            case '#delete-bm-dialog-context':
                return $(id).dialog({
                    autoOpen: false,
                    resizable: false,
                    height: 'auto',
                    width: 400,
                    modal: true,
                })
            case '#add-bm-dialog':
                $('#add-bm-accordion').accordion({
                    collapsible: true,
                    active: false,
                    heightStyle: 'content',
                    icons: false,
                })
                $("input[type='radio']").checkboxradio()

                $("[name='method']").on('change', function (e) {
                    $('#add-bm-error').hide()
                    if (e.target.id === 'method-file') {
                        $('#add-bm-input').hide()
                        $('#add-bm-file').show()
                    } else {
                        $('#add-bm-input').show()
                        $('#add-bm-file').hide()
                    }
                })
                return $(id).dialog({
                    autoOpen: false,
                    height: 400,
                    width: 350,
                    modal: true,
                    open: async function () {
                        $('#add-bm-error').hide()
                        initAddTree((await browser.bookmarks.getTree())[0])
                        if ($('#method-form').prop('checked')) {
                            $('#add-bm-input').show()
                            $('#add-bm-file').hide()
                        } else {
                            $('#add-bm-input').hide()
                            $('#add-bm-file').show()
                        }
                    },
                    buttons: {
                        Add: async function () {
                            $('#add-bm-error').hide()
                            if ($('#method-form').prop('checked')) {
                                let newBM = {
                                    parentId:
                                        $('#add-bm-accordion').attr(
                                            'selected-location'
                                        ),
                                    title: $('#name').val(),
                                    url: $('#url').val(),
                                }
                                try {
                                    await browser.bookmarks.create(newBM)
                                    $('#add-bm-dialog form').trigger('reset')
                                } catch (e) {
                                    $('#add-bm-error-msg').text(
                                        'Invalid bookmark'
                                    )
                                    $('#add-bm-error').show()
                                }
                            } else {
                                const file = $('#bm-text-file')[0].files[0]
                                if (file && file.type === 'text/plain') {
                                    fetch_progress.dialog('open')
                                    const reader = new FileReader()
                                    reader.onload = async function (event) {
                                        const fileString = event.target.result
                                        const bookmarks =
                                            splitByWhiteSpaces(fileString)
                                        for (let item of bookmarks) {
                                            const validatedString = isValidUrl(
                                                item.trim()
                                            )

                                            if (validatedString) {
                                                await browser.bookmarks.create({
                                                    url: item,
                                                    title: file.name,
                                                    parentId:
                                                        $(
                                                            '#add-bm-accordion'
                                                        ).attr(
                                                            'selected-location'
                                                        ),
                                                })
                                            }
                                        }
                                        fetch_progress.dialog('close')
                                    }
                                    reader.readAsText(file)
                                } else {
                                    $('#add-bm-error-msg').text(
                                        'Invalid file. Please select a plain text file.'
                                    )
                                    $('#add-bm-error').show()
                                }
                            }
                        },

                        Cancel: function () {
                            $(this).dialog('close')
                        },
                    },
                    close: function () {
                        browser.tabs.reload()
                    },
                })
            case '#edit-bm-dialog':
                $('#edit-bm-accordion').accordion({
                    collapsible: true,
                    active: false,
                    heightStyle: 'content',
                    icons: false,
                })
                return $(id).dialog({
                    autoOpen: false,
                    height: 400,
                    width: 350,
                    modal: true,

                    close: function () {
                        browser.tabs.reload()
                    },
                })
            case '#fetch-progress':
                $('#progressbar').progressbar({
                    value: false,
                })
                return $(id).dialog({
                    autoOpen: false,
                    closeOnEscape: false,
                    resizable: false,
                    buttons: [
                        {
                            text: 'Hide',
                            click: function () {
                                $(this).dialog('close')
                            },
                        },
                    ],
                })
            case '#add-folder-dialog':
                return $(id).dialog({
                    autoOpen: false,
                    modal: true,
                })

            case '.controlgroup':
                return $(id).controlgroup({
                    classes: {
                        'ui-controlgroup': 'bg-red',
                    },
                })
            case '#message-dialog':
                return $(id).dialog({
                    autoOpen: false,
                })
            case '#error-dialog':
                return $(id).dialog({
                    autoOpen: false,
                })
            case '#settings-dialog':
                settings && settings.faviconSrc
                    ? $('#favicon-src').val(settings.faviconSrc)
                    : false
                settings && settings.titleSrc
                    ? $('#title-src').val(settings.titleSrc)
                    : false

                return $(id).dialog({
                    autoOpen: false,

                    buttons: [
                        {
                            text: 'Save',
                            click: async function () {
                                settings.faviconSrc = $('#favicon-src').val()
                                settings.titleSrc = $('#title-src').val()
                                await browser.storage.local
                                    .set({ settings })
                                    .then(() => $(this).dialog('close'))
                            },
                        },
                        {
                            text: 'Close',
                            click: function () {
                                $(this).dialog('close')
                                browser.tabs.reload()
                            },
                        },
                    ],
                })
            case '.select-menu':
                return $(id).selectmenu()
        }
    },
}

export default widgets
