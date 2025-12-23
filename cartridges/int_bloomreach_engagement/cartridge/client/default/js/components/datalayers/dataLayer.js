'use strict';
var eventProperties = {};

function initViewItemEvent() {
    var $viewItem = $('.data-layer-view-item');

    if ($viewItem.length && $viewItem.val()) {
        try {
            var viewItemJSON = JSON.parse($viewItem.val());
            dataLayer.push(viewItemJSON);
            exponea.track(dataLayer);
        } catch {
            return false;
        }
    }
}

function initViewCategoryEvent() {
    var $viewCategory = $('.data-layer-view-category');

    if ($viewCategory.length && $viewCategory.val()) {
        try {
            var viewCategoryJSON = JSON.parse($viewCategory.val());
            dataLayer.push(viewCategoryJSON);
            exponea.track(dataLayer);
        } catch {
            return false;
        }
    }
}

function initIdentificationEvent() {
    var $identification = $('.data-layer-identification');

    if ($identification.length && $identification.val()) {
        try {
            if ($('.page').data('action') === 'Account-Show' && $('.page').data('querystring').indexOf('registration=false') > -1) {
                var identificationJSON = JSON.parse($identification.val());
                dataLayer.push(identificationJSON);
                exponea.track(dataLayer);
            }
        } catch {
            return false;
        }
    }
}

function initLogoutEvent() {
    var logoutObj = {
        'namespace': window.brDataLayerNamespace,
        'event_name': 'logout',
        'event_properties': {
        }
    }
    dataLayer.push(logoutObj);
}

function initViewCartUpdateEvent(eventProperties) {
    if (!$.isEmptyObject(eventProperties)) {
        var productID = eventProperties.productID;
        var cartUpdateUrl = window.cartUpdateUrl;
        if (productID && cartUpdateUrl) {
            $.ajax({
                url: cartUpdateUrl,
                method: 'POST',
                data: {
                    productID: productID,
                    eventProperties: JSON.stringify(eventProperties)
                },
                success: function (data) {
                    try {
                        var cartUpdateObj = JSON.parse(data.cartUpdateObj);
                        dataLayer.push(cartUpdateObj);
                        exponea.track(dataLayer);
                    } catch {
                        return false;
                    }
                }
            });
        }
    }
}

function getProductIdFromPage(element) {
    var productID;
    if ($('#quickViewModal').hasClass('show') && !$('.product-set').length) {
        productID = $(element).closest('.modal-content').find('.product-quickview').data('pid');
    } else if ($('.product-set-detail').length || $('.product-set').length) {
        productID = $(element).closest('.product-detail').find('.product-id').text();
    } else {
        productID = $('.product-detail:not(".bundle-item")').data('pid');
    }

    return productID;
}

function addEventProperties(action, button_copy, button_type, page_type, productID) {
    eventProperties.action = action;
    eventProperties.button_copy = button_copy;
    eventProperties.button_type = button_type;
    eventProperties.page_type = page_type;
    eventProperties.productID = productID;
}

function selectVariant(selectedValueUrl) {
    if (selectedValueUrl) {
        var pid = $('[data-masterid]').data('masterid') || '';
        $.ajax({
            url: window.variationViewItemURL + '?' + selectedValueUrl + '&pid=' + pid,
            method: 'GET',
            success: function (data) {
                try {
                    var viewItemJSON = JSON.parse(data.viewItemObj);
                    dataLayer.push(viewItemJSON);
                    exponea.track(dataLayer);
                } catch {
                    return false;
                }
            }
        });
    }
}

function selectSortOrder(selectedValueUrl) {
    if (selectedValueUrl) {
        $.ajax({
            url: window.sortOrderViewCategoryURL + '?' + selectedValueUrl,
            method: 'GET',
            success: function (data) {
                try {
                    var viewCategoryJSON = JSON.parse(data.viewCategoryObj);
                    dataLayer.push(viewCategoryJSON);
                    exponea.track(dataLayer);
                } catch {
                    return false;
                }
            }
        });
    }
}

function selectFilter(selectedValueUrl) {
    if (selectedValueUrl) {
        $.ajax({
            url: window.filterViewCategoryURL + '?' + selectedValueUrl,
            method: 'GET',
            success: function (data) {
                try {
                    var viewCategoryJSON = JSON.parse(data.viewCategoryObj);
                    dataLayer.push(viewCategoryJSON);
                    exponea.track(dataLayer);
                } catch {
                    return false;
                }
            }
        });
    }
}

function initEvents() {
    initViewItemEvent();
    initViewCategoryEvent();
    initIdentificationEvent();
}

$(document).ready(function () {
    //run on PDP loaded
    initEvents();

    //SFRA Quick View modal open event listener
    $('body').on('shown.bs.modal', '#quickViewModal', function () {
        initViewItemEvent();
    });

    //SG Quick View dialog open event listener
    $('body').on('dialogopen', '.ui-dialog', function () {
        initViewItemEvent();
    });

    //Logout event listener
    $('body').on('click', '.js-logout, .user-logout, .account-logout a', function () {
        initLogoutEvent();
    });

    //SFRA select variant event listener
    $('body').on('change', '.attribute select[class*="select-"]', function (element) {
        element.preventDefault();

        selectVariant(element.currentTarget.value);
    });

    //SFRA select variant event listener
    $('body').on('click', '.attribute .color-attribute', function (element) {
        element.preventDefault();

        selectVariant(element.currentTarget.dataset.url);
    });

    //SG select variant event listener
    $('body').on('click', '.attribute .swatches .swatchanchor', function (element) {
        element.preventDefault();

        selectVariant(element.currentTarget.href);
    });

    // SFRA sort order on change event listener
    $('body').on('change', '#product-search-results select[name*="sort-order"]', function (element) {
        element.preventDefault();

        selectSortOrder(element.currentTarget.value);
    });

    //SFRA sort order on change event listener
    $('.container').on('click', '.refinements li button, .refinement-bar button.reset, .filter-value button, .swatch-filter button', function (element) {
        element.preventDefault();

        selectFilter(element.currentTarget.dataset.href);
    });

    //Add to cart/cart update events listeners
    $('body').on('click', '.js-add-to-cart-container button.add-to-cart, .js-add-to-cart-container button.add-to-cart-global', function (element) {
        element.preventDefault();

        addEventProperties('add', window.buttonsText.addToCartBtn, 'product-details', 'product', getProductIdFromPage(element.currentTarget));
    });

    $('body').on('product:afterAddToCart', function () {
        initViewCartUpdateEvent(eventProperties);
        eventProperties = {};
    });

    $('body').on('change', '.cart-page .quantity-form > .quantity', function (element) {
        element.preventDefault();

        addEventProperties('update', window.buttonsText.updateQty, 'cart', 'cart', element.currentTarget.dataset.pid);
    });

    $('body').on('change', '.minicart .quantity', function (element) {
        element.preventDefault();

        addEventProperties('update', window.buttonsText.updateQty, 'minicart', 'minicart', element.currentTarget.dataset.pid);
    });

    $('body').on('click', '.update-cart-product-global', function (element) {
        element.preventDefault();

        addEventProperties('update', window.buttonsText.updateBtn, 'cart', 'cart', getProductIdFromPage(element.currentTarget));
    });

    $('body').on('click', 'button.remove-product', function (element) {
        element.preventDefault();

        addEventProperties('update', window.buttonsText.removeBtn, 'cart', 'cart', element.currentTarget.dataset.pid);
    });

    $('body').on('cart:update', function () {
        initViewCartUpdateEvent(eventProperties);
        eventProperties = {};
    });
});
