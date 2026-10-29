sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    'sap/ui/model/Sorter',
    'sap/ui/export/library',
    'sap/ui/core/Fragment',
    'sap/ui/Device',
    'sap/ui/export/Spreadsheet'
],
    function (Controller, JSONModel, Filter, MessageToast, MessageBox, Sorter, exportLibrary, Fragment, Device, Spreadsheet) {
        var EdmType = exportLibrary.EdmType;
        var dataCsv = [];
        //#JB var columnasCsv = 3;
        var columnasCsv = 4;

        return Controller.extend("com.claro.proveedores.adminusuarios.controller.View1", {

            onInit: function () {
                this._mViewSettingsDialogs = {};
                this.getOwnerComponent().getRouter().getRoute("view1").attachPatternMatched(this._onObjectMatched, this);
                sap.ui.getCore().getConfiguration().setLanguage("es");
            },

            _onObjectMatched: function () {
                this.openBusyDialog();
                this.jsonDataUser = {
                    userName: "",
                    userCode: "",
                    userMail: ""
                };
                if (parent.sap.ushell !== undefined) {
                    var dataUser = parent.sap.ushell.Container.getUser();
                    var code = dataUser.getEmail() === undefined ? dataUser.getId() : dataUser.getEmail();
                    code = code.split("@")[0].toUpperCase();

                    this.jsonDataUser = {
                        userName: dataUser.getFullName(),
                        userCode: code,
                        userMail: dataUser.getEmail() === undefined ? "" : dataUser.getEmail()
                    };
                }
                this.jsonDataAuth0 = {
                    token_auth0: "",
                    url: ""
                };
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();

                var modelSettings = new JSONModel({
                    titluloUsuario: "Resultados (0)",
                    enabledButtonTable: false
                });

                this.initArrayObjectView();

                this.getView().setModel(modelSettings, "modelSettings");

                /*var oTable = this.getView().byId("oTableUsuarioId");
                oTable.getColumns().forEach(function (element) {
                    var items = element.getHeader();
                    items.addItem(new sap.ui.core.Icon({ color: "#0064d9", size: "1rem" }).addStyleClass("sapUiTinyMarginBegin"));
                    items.addItem(new sap.ui.core.Icon({ color: "#0064d9", size: "1rem" }).addStyleClass("sapUiTinyMarginBegin"));
                }.bind(this));*/

                this.getTokenAuth0().then(function (oResultsTokenAuth0) {
                    this.getEstadoPortal().then(function (oResultsEstadoPortal) {
                        this.getTipoDeUsuario().then(function (oResultsTipoDeUsuario) {

                            this.jsonDataAuth0 = {
                                token_auth0: oResultsTokenAuth0.AccessToken,
                                url: oResultsTokenAuth0.Url
                            };
                            this.oResultsTipoDeUsuario = oResultsTipoDeUsuario;
                            this.oResultsEstadoPortal = oResultsEstadoPortal;
                            this.oActualizarVista();
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            },

            oActualizarVista: function () {
                this.openBusyDialog();
                var oModeloUsuarioPortal = new JSONModel({
                    TITULO_TABLA: "Resultados (0)",
                    DATA: []
                });
                this.getView().setModel(oModeloUsuarioPortal, "oModeloUsuarioPortal");
                oModeloUsuarioPortal.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);

                var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gUsersMaster');
                var settings = {
                    "url": url,
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "data": JSON.stringify({
                        "input": {
                            USERTYPEID: "",
                            USERSTATUSID: "",
                            paramAuth0: {
                                AccessToken: this.jsonDataAuth0.token_auth0,
                                Url: this.jsonDataAuth0.url
                            }
                        }
                    })
                };

                $.ajax(settings).done(function (response) {
                    let dataResponse = response.filter((f) => {
                        return f.DATA_AUTH0.create;
                    });
                    //let dataResponse = response;
                    dataResponse.forEach(element => {
                        element.BLOCKED_AUTH0 = element.DATA_AUTH0.blocked === undefined || element.DATA_AUTH0.blocked === false ? false : true;
                        element.BLOCKED_AUTH0_TEXT = element.DATA_AUTH0.blocked === undefined || element.DATA_AUTH0.blocked === false ? "Activo" : "Bloqueado";
                    });
                    oModeloUsuarioPortal.setData({
                        DATA: dataResponse
                    })
                    this.setTituloTabla();
                    oModeloUsuarioPortal.refresh();
                    this.BusyDialog.close();
                }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                    this.setTituloTabla();
                    this.BusyDialog.close();
                }.bind(this));
            },

            initArrayObjectView: function () {

                this.arrayObjectView = [
                    {
                        id: "oInputCorreoUsuarioId",
                        required: true,
                        type: "ip"
                    }, {
                        id: "oInputNombreUsuarioId",
                        required: true,
                        type: "ip"
                    }, {
                        id: "oSelectTipoUsuarioId",
                        required: true,
                        type: "sl"
                    }, {
                        id: "oSelectEstadoPortalId",
                        required: true,
                        type: "sl"
                    }, {
                        id: "oSelectEstadoAuth0Id",
                        required: true,
                        type: "sl"
                    }];
                return;
            },

            colorStateAuth0: function (value) {
                var color = "Success";

                if (value) {
                    color = "Error";
                }

                return color;
            },

            colorState: function (id) {
                var color = "None";

                if (id === "01") {
                    color = "Information";
                } else if (id === "02") {
                    color = "Success";
                } else if (id === "90") {
                    color = "Warning";
                } else if (id === "90") {
                    color = "Error";
                }

                return color;
            },

            invertedState: function (id) {
                var color = true;

                if (id === "10") {
                    color = false;
                }

                return color;
            },

            openAddPerfiles: function (oEvent) {
                this.itemSeleccionadoUsuario = oEvent.getSource().getBindingContext("oModeloUsuarioPortal").getObject();
                this.levantarPerfiles();
            },

            levantarPerfiles: function () {
                if (!this._oViewSettingsDialogAddPerfiles) {
                    this._oViewSettingsDialogAddPerfiles = sap.ui.xmlfragment(
                        "com.claro.proveedores.adminusuarios.view.fragments.listPerfilesPorUsuario", this);
                    this.getView().addDependent(this._oViewSettingsDialogAddPerfiles);
                }
                //this._oViewSettingsDialogAddPerfiles.bindElement(this.pathLevantar);
                this._oViewSettingsDialogAddPerfiles.open();

                var toggleButton = sap.ui.getCore().byId("buttonDeletePerfilesId");
                toggleButton.setEnabled(false).setPressed(false);

                var modeloPerfilesPorUsuario = new JSONModel([]);
                this._oViewSettingsDialogAddPerfiles.setModel(modeloPerfilesPorUsuario, "modeloPerfilesPorUsuario");
                //modeloPerfilesPorUsuario.setSizeLimit(2147483647);
                this._oViewSettingsDialogAddPerfiles.setBusy(true);
                this.openBusyDialog();

                var cantidadPerfiles = sap.ui.getCore().byId("cantidadPerfilesId");
                cantidadPerfiles.setText("Resultados (0)");
                var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gUserProfiles');
                var settings = {
                    "url": url,
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "data": JSON.stringify({
                        "input": {
                            "userID": this.itemSeleccionadoUsuario.USERID
                        }
                    })
                };

                $.ajax(settings).done(function (oDataRU) {
                    let respuestaRU = oDataRU.sort((a, b) => {
                        if (a.DESCRIPTION < b.DESCRIPTION) {
                            return -1;
                        }
                    });

                    this.BusyDialog.close();
                    cantidadPerfiles.setText("Resultados (" + respuestaRU.length + ")");
                    modeloPerfilesPorUsuario.setData(respuestaRU);
                    modeloPerfilesPorUsuario.refresh();
                    if (respuestaRU.length > 0) {
                        jQuery.sap.delayedCall(1000, this, function () {
                            toggleButton.setEnabled(true);
                            this._oViewSettingsDialogAddPerfiles.setBusy(false);
                        }.bind(this));
                    } else {
                        this._oViewSettingsDialogAddPerfiles.setBusy(false);
                    }
                }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                    this.BusyDialog.close();
                }.bind(this));

            },

            closeAddPerfiles: function () {
                this._oViewSettingsDialogAddPerfiles.close();
            },


            onListarPerfiles: function () {

                this._oViewOnListarPerfiles = sap.ui.xmlfragment("com.claro.proveedores.adminusuarios.view.fragments.listPerfilesAdd", this);
                this.getView().addDependent(this._oViewOnListarPerfiles);
                this._oViewOnListarPerfiles.open();
                this._oViewOnListarPerfiles.attachAfterClose(function () {
                    this.closeonListarPerfiles();
                }.bind(this));
                var oModelAllPerfiles = new JSONModel([]);
                this._oViewOnListarPerfiles.setModel(oModelAllPerfiles, "oModelAllPerfiles");
                //oModelAllPerfiles.setSizeLimit(2147483647);
                let oSearchFieldCodPerfil = sap.ui.getCore().byId("oSearchFieldCodPerfilId");

                var input1 = document.getElementById(oSearchFieldCodPerfil.getId() + "-I");

                input1.addEventListener("paste", function (event) {
                    let paste = event.currentTarget.defaultValue;
                    paste = paste.toUpperCase();
                    //console.log(paste);
                }.bind(this));
                let oListSelectPerfiles = sap.ui.getCore().byId("oListSelectPerfilesId");
                oListSelectPerfiles.setHeaderText("Perfiles (0)");
                this.openBusyDialog();
                var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gProfiles');
                var settings = {
                    "url": url,
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "data": JSON.stringify({
                        "input": {
                            "userID": this.itemSeleccionadoUsuario.USERID
                        }
                    })
                };

                $.ajax(settings).done(function (oDataRU) {
                    var respuestaRU = oDataRU.filter(function (f) {
                        return f.ASSIGNED === false;
                    }.bind(this));
                    oModelAllPerfiles.setData(respuestaRU);
                    oListSelectPerfiles.setHeaderText("Perfiles (" + respuestaRU.length + ")");
                    oModelAllPerfiles.refresh();
                    this.BusyDialog.close();
                }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                    this.BusyDialog.close();
                }.bind(this));
            },

            closeonListarPerfiles: function () {
                this._oViewOnListarPerfiles.destroy();
            },

            openAddProveedores: function (oEvent) {
                this.itemSeleccionadoUsuario = oEvent.getSource().getBindingContext("oModeloUsuarioPortal").getObject();
                this.levantarProveedores();
            },

            levantarProveedores: function () {
                if (!this._oViewSettingsDialogAddProveedores) {
                    this._oViewSettingsDialogAddProveedores = sap.ui.xmlfragment(
                        "com.claro.proveedores.adminusuarios.view.fragments.listProveedoresPorUsuario", this);
                    this.getView().addDependent(this._oViewSettingsDialogAddProveedores);
                }
                //this._oViewSettingsDialogAddProveedores.bindElement(this.pathLevantar);
                this._oViewSettingsDialogAddProveedores.open();

                var toggleButton = sap.ui.getCore().byId("buttonDeleteProveedoresId");
                toggleButton.setEnabled(false).setPressed(false);

                var modeloProveedoresPorUsuario = new JSONModel([]);
                this._oViewSettingsDialogAddProveedores.setModel(modeloProveedoresPorUsuario, "modeloProveedoresPorUsuario");
                //modeloProveedoresPorUsuario.setSizeLimit(2147483647);
                this._oViewSettingsDialogAddProveedores.setBusy(true);
                this.openBusyDialog();

                var cantidadProveedores = sap.ui.getCore().byId("cantidadProveedoresId");
                cantidadProveedores.setText("Resultados (0)");
                var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gVendorSetPortal');
                var settings = {
                    "url": url,
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "data": JSON.stringify({
                        "input": {
                            "Mail": this.itemSeleccionadoUsuario.EMAIL,
                            "Supplier": "0000000000"
                        }
                    })
                };

                $.ajax(settings).done(function (oDataRU) {

                    let respuestaRU = oDataRU.sort((a, b) => {
                        if (a.Supplierfullname < b.Supplierfullname) {
                            return -1;
                        }
                    });

                    this.BusyDialog.close();
                    cantidadProveedores.setText("Resultados (" + respuestaRU.length + ")");
                    modeloProveedoresPorUsuario.setData(respuestaRU);
                    modeloProveedoresPorUsuario.refresh();
                    if (respuestaRU.length > 0) {
                        jQuery.sap.delayedCall(1000, this, function () {
                            toggleButton.setEnabled(true);
                            this._oViewSettingsDialogAddProveedores.setBusy(false);
                        }.bind(this));
                    } else {
                        this._oViewSettingsDialogAddProveedores.setBusy(false);
                    }
                }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                    this.BusyDialog.close();
                }.bind(this));

            },

            closeAddProveedores: function () {
                this._oViewSettingsDialogAddProveedores.close();
            },

            onListarProveedores: function () {

                this._oViewOnListarProveedores = sap.ui.xmlfragment("com.claro.proveedores.adminusuarios.view.fragments.listProveedoresAdd", this);
                this.getView().addDependent(this._oViewOnListarProveedores);
                this._oViewOnListarProveedores.open();
                this._oViewOnListarProveedores.attachAfterClose(function () {
                    this.closeonListarProveedores();
                }.bind(this));
                let oFilterbarProveedor = sap.ui.getCore().byId("oFilterbarProveedorId");
                oFilterbarProveedor.getAggregation("_searchButton").setText("Buscar");
                var oModelAllProveedores = new JSONModel([]);
                this._oViewOnListarProveedores.setModel(oModelAllProveedores, "oModelAllProveedores");
                //oModelAllProveedores.setSizeLimit(2147483647);
                let oInputNombreProveedor = sap.ui.getCore().byId("oInputNombreProveedorId");
                let oInputCodProveedor = sap.ui.getCore().byId("oInputCodProveedorId");

                var input1 = document.getElementById(oInputNombreProveedor.getId() + "-inner");
                var input2 = document.getElementById(oInputCodProveedor.getId() + "-inner");

                input1.addEventListener("keypress", function (event) {
                    if (event.key === "Enter") {
                        this.onSearchVendor();
                    }
                }.bind(this));
                input2.addEventListener("keypress", function (event) {
                    if (event.key === "Enter") {
                        this.onSearchVendor();
                    }
                }.bind(this));
            },

            closeonListarProveedores: function () {
                this._oViewOnListarProveedores.destroy();
            },

            onSearchVendor: function () {
                let oInputNombreProveedor = sap.ui.getCore().byId("oInputNombreProveedorId");
                let oInputCodProveedor = sap.ui.getCore().byId("oInputCodProveedorId");
                let valueINP = oInputNombreProveedor.getValue().trim();
                let valueICP = oInputCodProveedor.getValue().trim();
                let oFilter = [new Filter("Supplierblocked", "NE", 'X')];
                let oListSelectProveedores = sap.ui.getCore().byId("oListSelectProveedoresId");
                let buttonGuardarRolesAsignar = sap.ui.getCore().byId("buttonGuardarRolesAsignar");
                buttonGuardarRolesAsignar.setEnabled(false);
                oListSelectProveedores.setHeaderText("Proveedores (0)");
                if (valueINP.length > 4 || valueICP.length > 0) {
                    let oModelAllProveedores = this._oViewOnListarProveedores.getModel("oModelAllProveedores");
                    if (valueINP.length > 4) {
                        oFilter.push(new Filter("Supplierfullname", "EQ", valueINP));
                    }
                    if (valueICP.length > 0) {
                        oFilter.push(new Filter("Supplier", "EQ", valueICP));
                    }
                    this.openBusyDialog();
                    this.getView().getModel("modeloDatos").read("/vendorSet", {
                        filters: oFilter,
                        success: function (oData) {
                            let data = oData.results;
                            oListSelectProveedores.setHeaderText("Proveedores (" + data.length + ")");
                            oModelAllProveedores.setData(data);
                            oModelAllProveedores.refresh();
                            this.BusyDialog.close();
                        }.bind(this),
                        error: function (error) {
                            console.log(error);
                            this.BusyDialog.close();
                        }.bind(this)
                    });
                } else {
                    if (valueINP.length < 5 || valueICP.length === 0) {
                        MessageToast.show("Ingresa un mínimo de 5 letras para continuar con la búsqueda por nombre de proveedor");
                    } else {
                        MessageToast.show("Ingresa un nombre o código de proveedor para continuar con la búsqueda");
                    }

                }

            },

            matchCorreoVendorECC: function (datos) {
                return new Promise(function (resolve) {
                    datos.VENDORS = [];
                    let oFilter = [new Filter("Supplierblocked", "NE", 'X'), new Filter("Emailaddress", "EQ", datos.CORREO)];
                    let tipoUsuario = this.getTipoUsuario(datos.TIPO_USUARIO);
                    if (tipoUsuario !== "01") {
                        this.getView().getModel("modeloDatos").read("/vendorSet", {
                            filters: oFilter,
                            success: function (oData) {
                                let data = oData.results;
                                if (data.length > 0) {
                                    data.forEach(function (element, index) {
                                        let supp = element.Supplier.padStart(10, '0');
                                        datos.VENDORS.push({
                                            "code": supp
                                        });
                                        if (data.length === (index + 1)) {
                                            resolve();
                                        }
                                    }.bind(this));
                                } else {
                                    resolve();
                                }
                            }.bind(this),
                            error: function (error) {
                                resolve();
                            }.bind(this)
                        });
                    } else {
                        resolve();
                    }
                }.bind(this));
            },

            onChangeStatusPerfil: function (oEvent) {
                let item = oEvent;
                let source = item.getSource();
                this.sourceSeleccion = source;
                let parameters = item.getParameters();
                let objectSeleccion = source.getBindingContext("modeloPerfilesPorUsuario").getObject();
                let profileid = objectSeleccion.PROFILEID;
                let state = parameters.state;
                let param = {};
                param.USERID = this.itemSeleccionadoUsuario.USERID;
                param.PROFILEID = profileid;
                param.DELETESTATUS = state ? "1" : "0";

                MessageBox.show("¿Seguro deseas realizar está acción?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/uStateUserProfiles');
                            var settings = {
                                "url": url,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json"
                                },
                                "data": JSON.stringify({
                                    "input": param
                                })
                            };

                            $.ajax(settings).done(function (oDataRU) {
                                this.setLogSystem("Actualización", oDataRU.message, oDataRU.data).then(function () {
                                    var respuestaRU = oDataRU;
                                    this.BusyDialog.close();
                                    MessageToast.show("Proceso finalizado correctamente");
                                    this.closeAddPerfiles();
                                    this.levantarPerfiles();
                                }.bind(this));
                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                this.BusyDialog.close();
                            }.bind(this));
                        } else {
                            this.sourceSeleccion.setState(!this.sourceSeleccion.getState());
                        }
                    }.bind(this)
                });
            },


            onChangeStatusProveedor: function (oEvent) {
                let item = oEvent;
                let source = item.getSource();
                this.sourceSeleccion = source;
                let parameters = item.getParameters();
                let objectSeleccion = source.getBindingContext("modeloProveedoresPorUsuario").getObject();
                let supplier = objectSeleccion.Supplier.padStart(10, '0');
                let state = parameters.state;
                let param = {};
                param.USERID = this.itemSeleccionadoUsuario.USERID;
                param.VENDORID = supplier;
                param.DELETESTATUS = state ? "1" : "0";

                MessageBox.show("¿Seguro deseas realizar está acción?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/uStateUsersvendors');
                            var settings = {
                                "url": url,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json"
                                },
                                "data": JSON.stringify({
                                    "input": param
                                })
                            };

                            $.ajax(settings).done(function (oDataRU) {
                                this.setLogSystem("Actualización", oDataRU.message, oDataRU.data).then(function () {
                                    var respuestaRU = oDataRU;
                                    this.BusyDialog.close();
                                    MessageToast.show("Proceso finalizado correctamente");
                                    this.closeAddProveedores();
                                    this.levantarProveedores();
                                }.bind(this));
                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                this.BusyDialog.close();
                            }.bind(this));
                        } else {
                            this.sourceSeleccion.setState(!this.sourceSeleccion.getState());
                        }
                    }.bind(this)
                });
            },

            onDeleteProveedorXUsuario: function (oEvent) {
                let item = oEvent;
                let source = item.getSource();
                let parameters = item.getParameters().listItem;
                this.sourceSeleccion = source;
                let objectSeleccion = parameters.getBindingContext("modeloProveedoresPorUsuario").getObject();
                let supplier = objectSeleccion.Supplier.padStart(10, '0');
                let param = {};
                param.USERID = this.itemSeleccionadoUsuario.USERID;
                param.VENDORID = supplier;
                MessageBox.show("¿Seguro deseas realizar está acción?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/dUsersvendors');
                            var settings = {
                                "url": url,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json"
                                },
                                "data": JSON.stringify({
                                    "input": param
                                })
                            };

                            $.ajax(settings).done(function (oDataRU) {
                                this.setLogSystem("Eliminación", oDataRU.message, oDataRU.data).then(function () {
                                    var respuestaRU = oDataRU;
                                    this.BusyDialog.close();
                                    MessageToast.show("Proceso finalizado correctamente");
                                    this.closeAddProveedores();
                                    this.levantarProveedores();
                                }.bind(this));
                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                this.BusyDialog.close();
                            }.bind(this));
                        }
                    }.bind(this)
                });
            },


            onDeletePerfilXUsuario: function (oEvent) {
                let item = oEvent;
                let source = item.getSource();
                let parameters = item.getParameters().listItem;
                this.sourceSeleccion = source;
                let objectSeleccion = parameters.getBindingContext("modeloPerfilesPorUsuario").getObject();
                let profileid = objectSeleccion.PROFILEID;
                let param = {};
                param.USERID = this.itemSeleccionadoUsuario.USERID;
                param.PROFILEID = profileid;
                MessageBox.show("¿Seguro deseas realizar está acción?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/dUserProfiles');
                            var settings = {
                                "url": url,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json"
                                },
                                "data": JSON.stringify({
                                    "input": param
                                })
                            };

                            $.ajax(settings).done(function (oDataRU) {
                                this.setLogSystem("Eliminación", oDataRU.message, oDataRU.data).then(function () {
                                    var respuestaRU = oDataRU;
                                    this.BusyDialog.close();
                                    MessageToast.show("Proceso finalizado correctamente");
                                    this.closeAddPerfiles();
                                    this.levantarPerfiles();
                                }.bind(this));
                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                this.BusyDialog.close();
                            }.bind(this));
                        }
                    }.bind(this)
                });
            },

            onSelectedItem: function (oEvent) {
                let buttonGuardarRolesAsignar = sap.ui.getCore().byId("buttonGuardarRolesAsignar");
                let item = oEvent;
                let parameters = item.getParameters();
                this.itemSeleccionadoProveedor = parameters.listItem.getBindingContext("oModelAllProveedores").getObject();
                let selected = parameters.selected;
                let cond = false;
                if (selected) {
                    cond = true;
                }
                buttonGuardarRolesAsignar.setEnabled(cond);
            },


            onSelectedItemsPerfiles: function (oEvent) {
                let buttonGuardarPerfilesAsignar = sap.ui.getCore().byId("buttonGuardarPerfilesAsignar");
                let item = oEvent;
                let parameters = item.getParameters();
                let listItemsPerfiles = parameters.listItems;
                let count = 0;
                this.arrayPerfilesSel = [];

                listItemsPerfiles.forEach(function (element) {
                    if (element.getSelected()) {
                        this.arrayPerfilesSel.push(element);
                    }
                }.bind(this));
                let cond = false;
                if (this.arrayPerfilesSel.length > 0) {
                    cond = true;
                }
                buttonGuardarPerfilesAsignar.setEnabled(cond);
            },

            onGuardarNuevoPerfiles: function () {

                MessageBox.show("¿Seguro desea realizar la asignación de perfiles?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var oList = sap.ui.getCore().byId("oListSelectPerfilesId");
                            let functionRecorrer = function (items, i) {
                                if (items.length === i) {
                                    this.BusyDialog.close();
                                    MessageToast.show("Proceso finalizado correctamente");
                                    this.closeonListarPerfiles();
                                    this.closeAddPerfiles();
                                    this.levantarPerfiles();
                                } else {
                                    let item = items[i];
                                    let obj = item.getBindingContext("oModelAllPerfiles").getObject();
                                    let param = {};
                                    param.USERID = this.itemSeleccionadoUsuario.USERID;
                                    param.PROFILEID = obj.PROFILEID;
                                    param.DELETESTATUS = "1";

                                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/cUserProfiles');
                                    var settings = {
                                        "url": url,
                                        "method": "POST",
                                        "headers": {
                                            "Content-Type": "application/json"
                                        },
                                        "data": JSON.stringify({
                                            "input": param
                                        })
                                    };

                                    $.ajax(settings).done(function (oDataRU) {
                                        this.setLogSystem("Creación", oDataRU.message, oDataRU.data).then(function () {

                                            i++;
                                            functionRecorrer(items, i);
                                        }.bind(this));
                                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                        i++;
                                        functionRecorrer(items, i);
                                    }.bind(this));
                                }
                            }.bind(this);

                            functionRecorrer(oList.getSelectedItems(), 0);

                        }
                    }.bind(this)
                });
            },

            onGuardarNuevoProveedor: function () {
                let supplier = this.itemSeleccionadoProveedor.Supplier.padStart(10, '0')
                let param = {};
                param.USERID = this.itemSeleccionadoUsuario.USERID;
                param.VENDORID = supplier;
                param.FIRSTACCESS = 0;
                param.DATEFIRSTACCESS = null;
                param.DELETESTATUS = "1";

                MessageBox.show("¿Seguro desea realizar la asignación de este proveedor?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/cUsersvendors');
                            var settings = {
                                "url": url,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json"
                                },
                                "data": JSON.stringify({
                                    "input": param
                                })
                            };

                            $.ajax(settings).done(function (oDataRU) {
                                this.setLogSystem("Creación", oDataRU.message, oDataRU.data).then(function () {
                                    var respuestaRU = oDataRU;
                                    this.BusyDialog.close();
                                    MessageToast.show("Proceso finalizado correctamente");
                                    this.closeonListarProveedores();
                                    this.closeAddProveedores();
                                    this.levantarProveedores();
                                }.bind(this));
                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                if (jqXHR.responseJSON.code === 301) {
                                    MessageToast.show("Proveedor asignado previamente al usuario.");
                                } else {
                                    MessageToast.show("No fue posible finalizar correctamente el proceso.");
                                }
                                this.BusyDialog.close();
                            }.bind(this));
                        }
                    }.bind(this)
                });
            },

            onSearchListPerfil: function (oEvent) {
                var oList = sap.ui.getCore().byId("listaPerfilesId");
                var searchText = sap.ui.getCore().byId("oSearchFieldListPerfilesId").getValue();
                var filters = [];

                if (searchText.trim() !== '') {
                    var filter1 = new Filter({
                        path: "DESCRIPTION",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    var filter2 = new Filter({
                        path: "PROFILEID",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    filters = [filter1, filter2];
                }
                var finalFilter = new sap.ui.model.Filter({
                    filters: filters,
                    and: false
                });

                if (filters.length === 0) {
                    finalFilter = [];
                }

                oList.getBinding("items").filter(finalFilter, sap.ui.model.FilterType.Application);

            },

            onSearchListProveedor: function (oEvent) {
                var oList = sap.ui.getCore().byId("listaProveedoresId");
                var searchText = sap.ui.getCore().byId("oSearchFieldListProveedorId").getValue();
                var filters = [];

                if (searchText.trim() !== '') {
                    var filter1 = new Filter({
                        path: "Supplierfullname",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    var filter2 = new Filter({
                        path: "Supplier",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    filters = [filter1, filter2];
                }
                var finalFilter = new sap.ui.model.Filter({
                    filters: filters,
                    and: false
                });

                if (filters.length === 0) {
                    finalFilter = [];
                }

                oList.getBinding("items").filter(finalFilter, sap.ui.model.FilterType.Application);

            },

            onPressToggleButtonDeletePerfiles: function () {

                var list = sap.ui.getCore().byId("listaPerfilesId");

                var mode = "None";
                if (list.getMode() === "None") {
                    mode = "Delete";
                }
                list.setMode(mode);

            },

            onPressToggleButtonDelete: function () {

                var list = sap.ui.getCore().byId("listaProveedoresId");

                var mode = "None";
                if (list.getMode() === "None") {
                    mode = "Delete";
                }
                list.setMode(mode);

            },

            setTituloTabla: function () {
                var oModeloUsuarioPortal = this.getView().getModel("oModeloUsuarioPortal");
                var modelSettings = this.getView().getModel("modelSettings");
                var countData = oModeloUsuarioPortal.getData().DATA.length;
                oModeloUsuarioPortal.setProperty("/TITULO_TABLA", "Resultados (" + this.currencyValue(countData).toString() + ")");
                var cond = false;
                if (countData > 0) {
                    cond = true;
                }
                modelSettings.setProperty("/enabledButtonTable", cond);
                modelSettings.refresh();
                this.getView().byId("oTableUsuarioId").getBinding("items").sort([new Sorter("DATA_AUTH0/updated_at", true)]);
            },

            setTituloTablaFilter: function (count) {
                var oModeloUsuarioPortal = this.getView().getModel("oModeloUsuarioPortal");
                var modelSettings = this.getView().getModel("modelSettings");
                var countData = count;
                oModeloUsuarioPortal.setProperty("/TITULO_TABLA", "Resultados (" + this.currencyValue(countData).toString() + ")");
                var cond = false;
                if (countData > 0) {
                    cond = true;
                }
                modelSettings.setProperty("/enabledButtonTable", cond);
                modelSettings.refresh();
                this.getView().byId("oTableUsuarioId").getBinding("items").sort([new Sorter("DATA_AUTH0/updated_at", true)]);
            },

            oupdateFinishedTitle: function (oEvent) {
                if (oEvent.getParameters().reason === "Filter") {
                    let total = oEvent.getParameters().total;
                    this.setTituloTablaFilter(total);
                }
            },

            currencyValue: function (value) {
                var formatNumber = {
                    separador: ".", // separador para los miles
                    sepDecimal: ',', // separador para los decimales
                    formatear: function (num) {
                        num += '';
                        var splitStr = num.split('.');
                        var splitLeft = splitStr[0];
                        var splitRight = splitStr.length > 1 ? this.sepDecimal + splitStr[1] : '';
                        var regx = /(\d+)(\d{3})/;
                        while (regx.test(splitLeft)) {
                            splitLeft = splitLeft.replace(regx, '$1' + this.separador + '$2');
                        }
                        return this.simbol + splitLeft + splitRight;
                    },
                    new: function (num, simbol) {
                        this.simbol = simbol || '';
                        return this.formatear(num);
                    }
                };

                var retorno = formatNumber.new(value, "");

                return retorno;
            },

            getTokenAuth0: function () {
                return new Promise(function (resolve) {

                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gTokenAuth0');
                    var settings = {
                        "url": url,
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "data": JSON.stringify({
                            "input": {}
                        })
                    };

                    $.ajax(settings).done(function (response) {
                        resolve(response);
                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                        resolve([]);
                    }.bind(this));

                }.bind(this));
            },

            getEstadoPortal: function () {
                return new Promise(function (resolve) {
                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gUsersstatus');
                    var settings = {
                        "url": url,
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "data": JSON.stringify({
                            "input": {}
                        })
                    };

                    $.ajax(settings).done(function (oDataResults) {
                        resolve(oDataResults);
                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                        resolve([]);
                    }.bind(this));

                }.bind(this));
            },

            getTipoDeUsuario: function () {
                return new Promise(function (resolve) {
                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/gUserstype');
                    var settings = {
                        "url": url,
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "data": JSON.stringify({
                            "input": {}
                        })
                    };

                    $.ajax(settings).done(function (oDataResults) {
                        resolve(oDataResults);
                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                        resolve([]);
                    }.bind(this));

                }.bind(this));
            },

            onDialogoEditarUsuario: function (oEvent) {
                var object = oEvent.getSource().getBindingContext("oModeloUsuarioPortal").getObject();
                this.jsonSeleccionEditar = object;

                this._oViewSettingsDialogEditUsuario = sap.ui.xmlfragment(
                    "com.claro.proveedores.adminusuarios.view.fragments.editarUsuario",
                    this);
                this._oViewSettingsDialogEditUsuario.open();
                this._oViewSettingsDialogEditUsuario.attachAfterClose(function () {
                    this.cerrarDialogoEdit();
                }.bind(this));
                let jsonEditar = {
                    USERSTATUSID_USERSTATUSID: object.USERSTATUSID_USERSTATUSID,
                    USERTYPEID_USERTYPEID: object.USERTYPEID_USERTYPEID,
                    EMAIL: object.EMAIL,
                    DATA_AUTH0: {
                        name: object.DATA_AUTH0.name,
                        blocked: object.BLOCKED_AUTH0,
                        email_verified: object.DATA_AUTH0.email_verified,
                        updated_at: object.DATA_AUTH0.updated_at
                    }
                };

                var oModelEdit = new JSONModel(jsonEditar);
                this._oViewSettingsDialogEditUsuario.setModel(oModelEdit, "oModelEdit");
                oModelEdit.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
                var oModelEstadoAuth0 = new JSONModel([{
                    text: "Activo",
                    key: false
                },
                {
                    text: "Bloqueado",
                    key: true
                }]);

                this._oViewSettingsDialogEditUsuario.setModel(oModelEstadoAuth0, "oModelEstadoAuth0");

                this._oViewSettingsDialogEditUsuario.setBusy(true);

                var oModelTipoUsuario = new JSONModel(this.oResultsTipoDeUsuario);
                var oModelEstadoPortal = new JSONModel(this.oResultsEstadoPortal);
                this._oViewSettingsDialogEditUsuario.setModel(oModelTipoUsuario, "oModelTipoUsuario");
                this._oViewSettingsDialogEditUsuario.setModel(oModelEstadoPortal, "oModelEstadoPortal");
                let oSelectEstadoPortal = sap.ui.getCore().byId("oSelectEstadoPortalIdEditar");
                oSelectEstadoPortal.setEnabled(true);
                if (object["USERSTATUSID_USERSTATUSID"] === "10") {
                    oSelectEstadoPortal.setEnabled(false);
                }
                this._oViewSettingsDialogEditUsuario.setBusy(false);

            },

            cerrarDialogoEdit: function () {
                this._oViewSettingsDialogEditUsuario.destroy();
            },

            resendEmailVerification: function () {

                let jsonEdit = {};
                jsonEdit.USERID = this.jsonSeleccionEditar.USERID;
                jsonEdit.EMAIL = this.jsonSeleccionEditar.EMAIL;
                jsonEdit.paramAuth0 = {
                    AccessToken: this.jsonDataAuth0.token_auth0,
                    Url: this.jsonDataAuth0.url
                };
                MessageBox.show("¿Seguro deseas realizar está acción?", {
                    icon: sap.m.MessageBox.Icon.QUESTION,
                    title: "Aviso",
                    actions: ["Aceptar", "Cancelar"],
                    onClose: function (sAction) {
                        if (sAction === 'Aceptar') {
                            this.openBusyDialog();
                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/uResendEmailVerification');
                            var settings = {
                                "url": url,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json"
                                },
                                "data": JSON.stringify({
                                    "input": jsonEdit
                                })
                            };

                            $.ajax(settings).done(function (oDataRU) {
                                    var respuestaRU = oDataRU;
                                    this.BusyDialog.close();
                                    MessageToast.show("Correo de verificación reenviado correctamente");
                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                MessageToast.show(jqXHR.responseJSON.message);
                                this.BusyDialog.close();
                            }.bind(this));
                        }
                    }.bind(this)
                });
            },

            editarUsuario: function () {

                var oInputCorreoUsuario = sap.ui.getCore().byId("oInputCorreoUsuarioIdEditar");
                var oInputNombreUsuario = sap.ui.getCore().byId("oInputNombreUsuarioIdEditar");
                var oSelectTipoUsuario = sap.ui.getCore().byId("oSelectTipoUsuarioIdEditar");
                var oSelectEstadoPortal = sap.ui.getCore().byId("oSelectEstadoPortalIdEditar");
                var oSelectEstadoAuth0 = sap.ui.getCore().byId("oSelectEstadoAuth0IdEditar");

                this.validateView(this.arrayObjectView, "Editar").then(function (responseValidate) {
                    if (!responseValidate) {
                        let change_email = "";
                        if (oInputCorreoUsuario.getValue() !== this.jsonSeleccionEditar.EMAIL) {
                            change_email = oInputCorreoUsuario.getValue();
                        }

                        let jsonEdit = {};
                        jsonEdit.USERID = this.jsonSeleccionEditar.USERID;
                        jsonEdit.EMAIL = this.jsonSeleccionEditar.EMAIL;
                        jsonEdit.CHANGE_EMAIL = change_email;
                        jsonEdit.USERTYPEID_USERTYPEID = oSelectTipoUsuario.getSelectedKey();
                        jsonEdit.USERSTATUSID_USERSTATUSID = oSelectEstadoPortal.getSelectedKey();
                        jsonEdit.AUTH0ID = this.jsonSeleccionEditar.AUTH0ID;
                        jsonEdit.AUTH0_BLOCKED = oSelectEstadoAuth0.getSelectedKey() === "false" ? false : true;
                        jsonEdit.NAME_USER = oInputNombreUsuario.getValue().trim();
                        jsonEdit.paramAuth0 = {
                            AccessToken: this.jsonDataAuth0.token_auth0,
                            Url: this.jsonDataAuth0.url
                        };
                        MessageBox.show("¿Seguro deseas realizar está acción?", {
                            icon: sap.m.MessageBox.Icon.QUESTION,
                            title: "Aviso",
                            actions: ["Aceptar", "Cancelar"],
                            onClose: function (sAction) {
                                if (sAction === 'Aceptar') {
                                    this.openBusyDialog();
                                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/uUsersMaster');
                                    var settings = {
                                        "url": url,
                                        "method": "POST",
                                        "headers": {
                                            "Content-Type": "application/json"
                                        },
                                        "data": JSON.stringify({
                                            "input": jsonEdit
                                        })
                                    };

                                    $.ajax(settings).done(function (oDataRU) {
                                        this.setLogSystem("Actualización", oDataRU.message, oDataRU.data).then(function () {
                                            var respuestaRU = oDataRU;
                                            this.BusyDialog.close();
                                            MessageToast.show("Proceso finalizado correctamente");
                                            this.cerrarDialogoEdit();
                                            this.oActualizarVista();
                                        }.bind(this));
                                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                        MessageToast.show(jqXHR.responseJSON.message);
                                        this.BusyDialog.close();
                                    }.bind(this));
                                }
                            }.bind(this)
                        });

                    } else {
                        MessageToast.show("Completa los campos vacíos o no validos para continuar.");
                        jQuery.sap.delayedCall(3000, this, function () {
                            this.setStateNone(this.arrayObjectView, "Editar").then(function () {

                            }.bind(this));
                        }.bind(this));
                    }
                }.bind(this));
            },

            onDialogoNuevaUsuario: function () {
                this._oViewSettingsDialogAddUsuario = sap.ui.xmlfragment(
                    "com.claro.proveedores.adminusuarios.view.fragments.agregarUsuario",
                    this);

                this._oViewSettingsDialogAddUsuario.open();

                this._oViewSettingsDialogAddUsuario.attachAfterClose(function () {
                    this.cerrarDialogoAdd();
                }.bind(this));

                var oModelEstadoAuth0 = new JSONModel([{
                    text: "Activo",
                    key: false
                },
                {
                    text: "Bloqueado",
                    key: true
                }]);

                this._oViewSettingsDialogAddUsuario.setModel(oModelEstadoAuth0, "oModelEstadoAuth0");

                this._oViewSettingsDialogAddUsuario.setBusy(true);

                var oModelTipoUsuario = new JSONModel(this.oResultsTipoDeUsuario);
                var oModelEstadoPortal = new JSONModel(this.oResultsEstadoPortal);
                this._oViewSettingsDialogAddUsuario.setModel(oModelTipoUsuario, "oModelTipoUsuario");
                this._oViewSettingsDialogAddUsuario.setModel(oModelEstadoPortal, "oModelEstadoPortal");
                this._oViewSettingsDialogAddUsuario.setBusy(false);
            },

            cerrarDialogoAdd: function () {
                this._oViewSettingsDialogAddUsuario.destroy();
            },



            addUsuario: function () {
                var oInputCorreoUsuario = sap.ui.getCore().byId("oInputCorreoUsuarioId");
                var oInputNombreUsuario = sap.ui.getCore().byId("oInputNombreUsuarioId");
                var oSelectTipoUsuario = sap.ui.getCore().byId("oSelectTipoUsuarioId");
                var oSelectEstadoPortal = sap.ui.getCore().byId("oSelectEstadoPortalId");
                var oSelectEstadoAuth0 = sap.ui.getCore().byId("oSelectEstadoAuth0Id");


                this.validateView(this.arrayObjectView, "").then(function (responseValidate) {
                    if (!responseValidate) {
                        let jsonAdd = {};
                        jsonAdd.USERID = null;
                        jsonAdd.EMAIL = oInputCorreoUsuario.getValue().trim();
                        jsonAdd.FIRSTCHANGEPASS = 0;
                        jsonAdd.DATEFIRSTCHANGEPASS = null;
                        jsonAdd.USERTYPEID_USERTYPEID = oSelectTipoUsuario.getSelectedKey();
                        jsonAdd.USERSTATUSID_USERSTATUSID = oSelectEstadoPortal.getSelectedKey();
                        jsonAdd.AUTH0ID = "";
                        jsonAdd.NAME_USER = oInputNombreUsuario.getValue().trim();
                        jsonAdd.VENDORS = [];
                        jsonAdd.paramAuth0 = {
                            AccessToken: this.jsonDataAuth0.token_auth0,
                            Url: this.jsonDataAuth0.url
                        };
                        MessageBox.show("¿Seguro deseas realizar está acción?", {
                            icon: sap.m.MessageBox.Icon.QUESTION,
                            title: "Aviso",
                            actions: ["Aceptar", "Cancelar"],
                            onClose: function (sAction) {
                                if (sAction === 'Aceptar') {
                                    this.openBusyDialog();
                                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/cUsersMaster');
                                    var settings = {
                                        "url": url,
                                        "method": "POST",
                                        "headers": {
                                            "Content-Type": "application/json"
                                        },
                                        "data": JSON.stringify({
                                            "input": jsonAdd
                                        })
                                    };

                                    $.ajax(settings).done(function (oDataRU) {
                                        this.setLogSystem("Creación", oDataRU.message, oDataRU.data).then(function () {

                                            var respuestaRU = oDataRU;
                                            this.BusyDialog.close();
                                            MessageToast.show("Proceso finalizado correctamente");
                                            setTimeout(() => {
                                                this.oActualizarVista();
                                            }, 1000);
                                            this.cerrarDialogoAdd();
                                        }.bind(this));
                                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                        MessageToast.show(jqXHR.responseJSON.message);
                                        this.BusyDialog.close();
                                    }.bind(this));
                                }
                            }.bind(this)
                        });
                    } else {
                        MessageToast.show("Completa los campos vacíos o no validos para continuar.");
                        jQuery.sap.delayedCall(3000, this, function () {
                            this.setStateNone(this.arrayObjectView, "").then(function () {

                            }.bind(this));
                        }.bind(this));
                    }
                }.bind(this));

            },

            grouper: function (oGroup) {
                var json = {
                    key: ""
                };

                if (oGroup.oModel.oData[oGroup.sPath.split("/")[1]].DeleteStatus !== "0") {
                    json.key = "Asignaciones activas";
                } else {
                    json.key = "Asignaciones inactivas";
                }

                return json;

            },

            grouperPerfiles: function (oGroup) {
                var json = {
                    key: ""
                };

                if (oGroup.oModel.oData[oGroup.sPath.split("/")[1]].DELETESTATUS !== "0") {
                    json.key = "Asignaciones activas";
                } else {
                    json.key = "Asignaciones inactivas";
                }

                return json;

            },

            getGroupHeader: function (oGroup) {

                return new sap.ui.core.SeparatorItem({
                    text: oGroup.key
                });
            },

            onLiveChangeLisProveedor: function (oEvent) {
                var oTable = this.getView().byId("oTableUsuarioId");
                var searchText = this.getView().byId("oSearchFieldProveedorId").getValue();
                var filters = [];

                if (searchText.trim() !== '') {
                    var filter1 = new Filter({
                        path: "DATA_AUTH0/name",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    var filter2 = new Filter({
                        path: "EMAIL",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    var filter3 = new Filter({
                        path: "DESCRIPTION_USERTYPE",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    filters = new sap.ui.model.Filter({
                        filters: [filter1, filter2, filter3],
                        and: false
                    });

                }

                oTable.getBinding("items").filter(filters, sap.ui.model.FilterType.Application);

            },

            oTextDate: function (sDate) {
                //2024-11-18T16:45:48.416Z;
                let date = "";
                let hora = "";
                let retorno = "";

                if (sDate !== null) {
                    if (sDate.length > 0) {
                        hora = sDate.split("T")[1].split(".")[0];
                        date = sDate.split("T")[0];
                        let a = date.split("-")[0];
                        let m = date.split("-")[1];
                        let d = date.split("-")[2];
                        retorno = d + "/" + m + "/" + a + " " + hora;
                    }
                }

                return retorno;
            },

            openBusyDialog: function (oEvent) {
                if (!this.BusyDialog) {
                    this.BusyDialog = sap.ui.xmlfragment("com.claro.proveedores.adminusuarios.view.fragments.BusyDialog", this);
                }

                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.BusyDialog);
                this.BusyDialog.open();
            },

            openBusyDialogCargando: function (oEvent) {
                // instantiate dialog
                if (!this.BusyDialogCargando) {
                    this.BusyDialogCargando = sap.ui.xmlfragment("com.claro.proveedores.adminusuarios.view.fragments.BusyDialogCargando", this);
                }

                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.BusyDialogCargando);
                this.BusyDialogCargando.open();
            },

            openBusyDialogUser: function (oEvent) {
                // instantiate dialog
                if (!this.BusyDialogUser) {
                    this.BusyDialogUser = sap.ui.xmlfragment("com.claro.proveedores.adminusuarios.view.fragments.BusyCrearUsuario", this);
                }

                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.BusyDialogUser);
                this.BusyDialogUser.open();
                sap.ui.getCore().byId("progressIndicatoirId").focus();
            },

            onlyUpperCase: function (oEvent) {
                let inputOC = oEvent.getSource();
                var retorno = inputOC.getValue().toUpperCase();
                inputOC.setValue(retorno);
            },

            onlyUpperCaseAndSearch: function (oEvent) {
                let inputOC = oEvent.getSource();
                var retorno = inputOC.getValue().toUpperCase();
                inputOC.setValue(retorno);
                this.onSearchListPerfilAdd();
            },

            onSearchListPerfilAdd: function (oEvent) {
                var oList = sap.ui.getCore().byId("oListSelectPerfilesId");
                var searchText = sap.ui.getCore().byId("oSearchFieldCodPerfilId").getValue();
                var filters = [];

                if (searchText.trim() !== '') {
                    var filter1 = new Filter({
                        path: "DESCRIPTION",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    var filter2 = new Filter({
                        path: "PROFILEID",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: searchText,
                        caseSensitive: false
                    });
                    filters = [filter1, filter2];
                }
                var finalFilter = new sap.ui.model.Filter({
                    filters: filters,
                    and: false
                });

                if (filters.length === 0) {
                    finalFilter = [];
                }

                oList.getBinding("items").filter(finalFilter, sap.ui.model.FilterType.Application);

            },


            onlyNumber: function (oEvent) {
                let inputOC = oEvent.getSource();
                var retorno = inputOC.getValue().replace(/[^0-9\_]/g, "");
                inputOC.setValue(retorno);
            },


            validateView: function (fields, accion) {
                return new Promise(function (resolve) {

                    var oModelSettings = this.getView().getModel("oModelSettings");
                    var ac = accion;
                    if (ac === undefined || ac === "add") {
                        ac = "";
                    }

                    var error = false;
                    var oCyclicFunction = function (item, l) {
                        if (item.length === l) {
                            resolve(error);
                        } else {
                            var camp;
                            camp = this.getView().byId(item[l].id + ac) || sap.ui.getCore().byId(item[l].id + ac);

                            var value;
                            if (item[l].required) {
                                if (ac === "") {
                                    if (camp.getVisible()) {
                                        if (item[l].type === "ip" || item[l].type === "dt") {
                                            value = camp.getValue().toString();
                                            if (value.trim().length === 0 || value.trim() === "Selecciona aquí...") {
                                                camp.setValueState("Error");
                                                error = true;
                                            }
                                        } else if (item[l].type === "sl" || item[l].type === "cb") {
                                            value = camp.getSelectedItem();
                                            if (value === null) {
                                                camp.setValueState("Error");
                                                error = true;
                                            }
                                        } else if (item[l].type === "stp") {
                                            value = camp.getValue();
                                            if (value < 1) {
                                                camp.setValueState("Error");
                                                error = true;
                                            }
                                        } else if (item[l].type === "up") {
                                            value = camp.getItems();
                                            if (value === 0) {
                                                error = true;
                                            }
                                        } else if (item[l].type === "ipRut") {
                                            value = camp.getValue().toString().replace(/ \ s * /g, "");

                                            if (value.trim().length === 0 || value.trim() === "-" || camp.getValueState() === "Error") {
                                                camp.setValueState("Error");
                                                error = true;
                                            }
                                        } else if (item[l].type === "sw") {
                                            value = camp;

                                        }
                                    } else {
                                        l++;
                                        oCyclicFunction(item, l);
                                    }
                                } else {
                                    if (camp.getVisible()) {
                                        if (item[l].type === "ip") {
                                            value = camp.getValue().toString();
                                            if (value.trim().length === 0) {
                                                camp.setValueState("Error");
                                                error = true;
                                            }
                                        } else if (item[l].type === "sl") {
                                            value = camp;
                                            if (value.getSelectedItem() === null && camp.getValue().length === 0) {
                                                camp.setValueState("Error");
                                                error = true;
                                            }
                                        }
                                    } else {
                                        l++;
                                        oCyclicFunction(item, l);
                                    }
                                }
                                l++;
                                oCyclicFunction(item, l);
                            } else {
                                l++;
                                oCyclicFunction(item, l);
                            }
                        }
                    }.bind(this);
                    oCyclicFunction(fields, 0);
                }.bind(this));
            },

            setStateNone: function (fields, accion) {
                return new Promise(function (resolve) {
                    var ac = accion;
                    if (ac === undefined) {
                        ac = "";
                    }
                    var oCyclicFunction = function (item, l) {
                        if (item.length === l) {
                            resolve();
                        } else {
                            var camp = this.getView().byId(item[l].id + ac) || sap.ui.getCore().byId(item[l].id + ac);
                            if (item[l].required) {
                                if (camp.getVisible()) {
                                    if (item[l].type === "ip" || item[l].type === "ipRut" || item[l].type === "dt" || item[l].type === "sl" || item[l].type ===
                                        "cb" || item[l].type ===
                                        "stp") {
                                        if (camp.getValueStateText() !== "Correo Inválido") {
                                            camp.setValueState("None");
                                        }
                                    }
                                    l++;
                                    oCyclicFunction(item, l);
                                } else {
                                    l++;
                                    oCyclicFunction(item, l);
                                }
                            } else {
                                l++;
                                oCyclicFunction(item, l);
                            }
                        }
                    }.bind(this);
                    oCyclicFunction(fields, 0);
                }.bind(this));
            },

            setStateNoneAll: function (fields, accion) {
                return new Promise(function (resolve) {
                    var ac = accion;
                    if (ac === undefined) {
                        ac = "";
                    }
                    var oCyclicFunction = function (item, l) {
                        if (item.length === l) {
                            resolve();
                        } else {
                            var camp = this.getView().byId(item[l].id + ac) || sap.ui.getCore().byId(item[l].id + ac);
                            if (item[l].required) {
                                if (camp.getVisible()) {
                                    if (item[l].type === "ip" || item[l].type === "ipRut" || item[l].type === "dt" || item[l].type === "sl" || item[l].type ===
                                        "cb" || item[l].type ===
                                        "stp") {
                                        camp.setValueState("None");
                                    }
                                    l++;
                                    oCyclicFunction(item, l);
                                } else {
                                    l++;
                                    oCyclicFunction(item, l);
                                }
                            } else {
                                l++;
                                oCyclicFunction(item, l);
                            }
                        }
                    }.bind(this);
                    oCyclicFunction(fields, 0);
                }.bind(this));
            },

            vaciarCamposEnPantalla: function (fields) {
                return new Promise(function (resolve) {

                    var oCyclicFunction = function (item, l) {
                        if (item.length === l) {
                            resolve();
                        } else {
                            var camp = this.getView().byId(item[l].id) || sap.ui.getCore().byId(item[l].id);

                            if (item[l].type === "ip" || item[l].type === "ipRut" || item[l].type === "dt" || item[l].type === "stp") {
                                camp.setValue();
                            } else if (item[l].type === "sl" || item[l].type === "cb") {
                                camp.setSelectedKey();
                            } else if (item[l].type === "up") {
                                camp.destroyItems();
                            } else if (item[l].type === "sw") {
                                camp.setState(false);
                            }
                            camp.setBusy(false);
                            l++;
                            oCyclicFunction(item, l);

                        }
                    }.bind(this);
                    oCyclicFunction(fields, 0);
                }.bind(this));
            },

            formatoCorreo: function (valor) {
                var value = valor.getParameters().value;
                var inputUser = valor.getSource();
                var re = /^([\da-z_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
                if (!re.exec(value)) {
                    inputUser.setValueState("Error");
                    inputUser.setValueStateText("Correo Inválido");
                    this.checkCorreo = false;
                } else {
                    inputUser.setValueState("None");
                    this.checkCorreo = true;
                }
            },

            handleSortButtonPressed: function () {
                this.getViewSettingsDialog("com.claro.proveedores.adminusuarios.view.fragments.SortDialog")
                    .then(function (oViewSettingsDialog) {
                        oViewSettingsDialog.open();
                    });
            },

            handleFilterButtonPressed: function () {
                this.getViewSettingsDialog("com.claro.proveedores.adminusuarios.view.fragments.FilterDialog")
                    .then(function (oViewSettingsDialog) {
                        oViewSettingsDialog.open();

                        var data = this.getView().byId("oTableUsuarioId").getModel("oModeloUsuarioPortal").getData().DATA;

                        var model0 = new JSONModel(),
                            data0 = [],
                            model1 = new JSONModel(),
                            data1 = [],
                            model2 = new JSONModel(),
                            data2 = [],
                            model3 = new JSONModel(),
                            data3 = [],
                            model4 = new JSONModel(),
                            data4 = [];

                        if (data.length > 0) {
                            for (var i in data) {
                                data0.push({
                                    key: data[i].DATA_AUTH0.name
                                });
                                data1.push({
                                    key: data[i].EMAIL
                                });
                                data2.push({
                                    key: data[i].DESCRIPTION_USERTYPE
                                });
                                data3.push({
                                    key: data[i].BLOCKED_AUTH0_TEXT,
                                    text: data[i].BLOCKED_AUTH0_TEXT
                                });
                                data4.push({
                                    key: data[i].DESCRIPTION_USERSTATUS
                                });


                            }
                            model0.setData([...new Map(data0.map(item => [item['key'], item])).values()]);
                            model1.setData([...new Map(data1.map(item => [item['key'], item])).values()]);
                            model2.setData([...new Map(data2.map(item => [item['key'], item])).values()]);
                            model3.setData([...new Map(data3.map(item => [item['key'], item])).values()]);
                            model4.setData([...new Map(data4.map(item => [item['key'], item])).values()]);
                        }
                        oViewSettingsDialog.setModel(model0, "oModelFilter0");
                        oViewSettingsDialog.setModel(model1, "oModelFilter1");
                        oViewSettingsDialog.setModel(model2, "oModelFilter2");
                        oViewSettingsDialog.setModel(model3, "oModelFilter3");
                        oViewSettingsDialog.setModel(model4, "oModelFilter4");

                    }.bind(this));
            },

            getViewSettingsDialog: function (sDialogFragmentName) {
                var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

                if (!pDialog) {
                    pDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: sDialogFragmentName,
                        controller: this
                    }).then(function (oDialog) {
                        if (Device.system.desktop) {
                            oDialog.addStyleClass("sapUiSizeCompact");
                        }

                        this.getView().addDependent(oDialog);
                        return oDialog;
                    }.bind(this));
                    this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
                }
                return pDialog;
            },

            handleSortDialogConfirm: function (oEvent) {
                var oTable = this.getView().byId("oTableUsuarioId"),
                    mParams = oEvent.getParameters(),
                    oBinding = oTable.getBinding("items"),
                    sPath,
                    sText,
                    bDescending,
                    aSorters = [];

                if (mParams.sortItem !== undefined) {
                    sPath = mParams.sortItem.getKey();
                    sText = mParams.sortItem.getText();
                    bDescending = mParams.sortDescending;
                    aSorters.push(new Sorter(sPath, bDescending));

                    oBinding.sort(aSorters);
                } else {
                    oBinding.sort([new Sorter("DATA_AUTH0/updated_at", true)]);
                }
            },

            handleFilterDialogConfirm: function (oEvent) {
                var oTable = this.getView().byId("oTableUsuarioId"),
                    mParams = oEvent.getParameters(),
                    oBinding = oTable.getBinding("items"),
                    aFilters = [],
                    arrayText = [];

                if (mParams.filterItems !== undefined) {
                    mParams.filterItems.forEach(function (oItem) {
                        var aText = oItem.getParent().getText(),
                            sPath = oItem.getParent().getKey(),
                            sOperator = "EQ",
                            sValue1 = oItem.getKey(),
                            oFilter = new Filter(sPath, sOperator, sValue1);
                        aFilters.push(oFilter);
                        arrayText.push(aText);
                    });

                    oBinding.filter(aFilters);
                }

            },

            createColumnConfig: function () {
                var i18n = this.getView().getModel("i18n").getResourceBundle();

                return [
                    {
                        label: "Nombre",
                        property: 'DATA_AUTH0/name',
                        type: EdmType.String
                    },
                    {
                        label: "Correo",
                        property: 'EMAIL',
                        type: EdmType.String
                    },
                    {
                        label: "Tipo usuario",
                        property: 'DESCRIPTION_USERTYPE',
                        type: EdmType.String
                    },
                    {
                        label: "Última actualización",
                        property: 'DATA_AUTH0/updated_at',
                        type: EdmType.String
                    },
                    {
                        label: "Estado auth0",
                        property: 'BLOCKED_AUTH0_TEXT',
                        type: EdmType.String
                    },
                    {
                        label: "Estado portal",
                        property: 'DESCRIPTION_USERSTATUS',
                        type: EdmType.String
                    }];
            },

            oDescargaExcel: function () {
                var aCols, oBinding, oSettings, oSheet, oTable;

                oTable = this.getView().byId('oTableUsuarioId');
                oBinding = oTable.getBinding('items');
                aCols = this.createColumnConfig();

                oSettings = {
                    workbook: { columns: aCols },
                    fileName: 'UsuariosPortalProveedoresyContratistas.xlsx',
                    dataSource: oBinding
                };

                oSheet = new Spreadsheet(oSettings);
                oSheet.build().then(function () {
                    MessageToast.show('Descarga finalizada');
                }).finally(function () {
                    oSheet.destroy();
                });
            },


            openMoreOption: function (oEvent) {

                var oButton = oEvent.getSource();

                if (!this._menu) {
                    this._menu = sap.ui.xmlfragment(
                        "com.claro.proveedores.adminusuarios.view.fragments.MenuItem",
                        this
                    );
                    this.getView().addDependent(this._menu);
                }

                var eDock = sap.ui.core.Popup.Dock;
                this._menu.open(this._bKeyboard, oButton, eDock.BeginTop, eDock.BeginBottom, oButton);

            },

            onPersoButtonPressed: function () {
                this._oTablePersonControl.openDialog();
            },

            openDialogoCargaMasiva: function (oEvent) {

                if (!this._oViewSettingsDialogOpenCargaMasiva) {
                    this._oViewSettingsDialogOpenCargaMasiva = sap.ui.xmlfragment(
                        "com.claro.proveedores.adminusuarios.view.fragments.CargaPopOver",
                        this);
                    this.getView().addDependent(this._oViewSettingsDialogOpenCargaMasiva);
                }
                this._oViewSettingsDialogOpenCargaMasiva.open();

            },

            cerrarDialogoCargaMasiva: function () {
                sap.ui.getCore().byId("idfileUploader").setValue();
                dataCsv = [];
                this._oViewSettingsDialogOpenCargaMasiva.close();
            },

            reemplazarDiacriticos: function (cadena) {
                var specialChars = "!¡#$^&%*()+=-[]\/{}|:<>?,áéíóúÁÉÍÓÚäëïöüÄËÏÖÜàèìòùÀÈÌÒÙñÑ‚¡¢£µÖàé„‰‹”ŽÓØ™š…Š•—·ÔÞãë¤¥½ð«";
                for (var i = 0; i < specialChars.length; i++) {
                    cadena = cadena.replace(new RegExp("\\" + specialChars[i], 'gi'), '');
                }
                return cadena;
            },

            onUpload: function (e) {
                var fU = sap.ui.getCore().byId("idfileUploader");
                if (fU.getValue().length > 0) {
                    this.openBusyDialogUser();
                    sap.ui.getCore().byId("BusyIndicatorText").setText("Este proceso puede tardar varios minutos...");
                    var domRef = fU.getFocusDomRef();
                    var file = this.fileCsv[0];
                    var reader = new FileReader();
                    var t = this;
                    reader.onload = function (e) {
                        var strCSV = e.target.result;
                        var arrCSV = this.reemplazarDiacriticos(strCSV);
                        arrCSV = arrCSV.match(/[\w-:.%+áéíóúÁÉÍÓÚäëïöüÄËÏÖÜ@àèìòùÀÈÌÒÙñÑ ]+(?=,?)/g);
                        var noOfCols = columnasCsv;
                        var hdrRow = arrCSV.splice(0, noOfCols);

                        this.prepararCargaMasiva(arrCSV, noOfCols, hdrRow).then(function (respuestaPrepararCargaMasiva) {
                            if (respuestaPrepararCargaMasiva) {
                                this.cargaMasiva().then(function (respuestaCargaMasiva) {
                                    if (respuestaCargaMasiva.resolve) {

                                        sap.ui.getCore().byId("BusyIndicatorText").setText("¡Listo!");
                                        jQuery.sap.delayedCall(1000, this, function () {
                                            this.cerrarDialogoCargaMasiva();
                                            this.BusyDialogUserClose();
                                            this.dialogoInforme(respuestaCargaMasiva);
                                            dataCsv = [];
                                        }.bind(this));

                                    }
                                }.bind(this));
                            } else {
                                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                                jQuery.sap.delayedCall(1300, this, function () {
                                    this.BusyDialogUserClose();
                                    dataCsv = [];
                                    MessageBox.error(
                                        "Archivo cargado no cuenta con los campos obligatorios ingresados.", {
                                        actions: [sap.m.MessageBox.Action.CLOSE],
                                        styleClass: bCompact ? "sapUiSizeCompact" : ""
                                    }
                                    );
                                }.bind(this));

                            }
                        }.bind(this));

                    }.bind(this);
                    reader.readAsBinaryString(file);
                } else {
                    MessageToast.show('Carga un archivo CSV para continuar.');
                }
            },

            BusyDialogUserClose: function () {
                this.sumaAvance = 0;
                this.avance = 0;
                sap.ui.getCore().byId("idfileUploader").setValue();
                sap.ui.getCore().byId("progressIndicatoirId").setDisplayValue();
                sap.ui.getCore().byId("progressIndicatoirId").setPercentValue(this.sumaAvance);
                this.BusyDialogUser.close();
            },

            //original 
            cargaMasiva2: function () {
                return new Promise(
                    function resolver(resolve, reject) {
                        this.totalUsuarios = dataCsv.length;
                        var datosCsv = {
                            dataCsv: dataCsv,
                            index: 0,
                            lengthDatos: dataCsv.length,
                            resolve: false,
                            datosValidados: [],
                            datosConErrores: []
                        };
                        var avanceFinal = 0;


                        this.cargaMasivaUsuarios(datosCsv).then(function (respuestaCargaMasivaUsuarios) {
                            if (respuestaCargaMasivaUsuarios.resolve) {

                                var functionCreateUserAuth0yHana = function (datosFunction, i) {
                                    var datosValidadosTotal = datosFunction.datosValidados.length;

                                    if (datosFunction.datosValidados.length === avanceFinal) {
                                        jQuery.sap.delayedCall(1000, this, function () {
                                            datosFunction.resolve = true;
                                            resolve(datosFunction);
                                        }.bind(this));

                                    } else {
                                        var numAvance = i + 1;
                                        sap.ui.getCore().byId("BusyIndicatorText").setText("Datos validados correctamente " + datosValidadosTotal +
                                            "... Creando (" + numAvance + " de " + datosValidadosTotal + ")");

                                        var element = datosFunction.datosValidados[i];
                                        let tipoUsuario = this.getTipoUsuario(element.TIPO_USUARIO);
                                        let jsonAdd = {};
                                        jsonAdd.USERID = null;
                                        jsonAdd.EMAIL = element.CORREO.trim();
                                        jsonAdd.FIRSTCHANGEPASS = 0;
                                        jsonAdd.DATEFIRSTCHANGEPASS = null;
                                        jsonAdd.USERTYPEID_USERTYPEID = tipoUsuario;
                                        jsonAdd.USERSTATUSID_USERSTATUSID = "10";
                                        jsonAdd.AUTH0ID = "";
                                        jsonAdd.NAME_USER = element.NOMBRE_APELLIDO.trim();

                                        jsonAdd.VENDORS = element.VENDORS;



                                        jsonAdd.paramAuth0 = {
                                            AccessToken: this.jsonDataAuth0.token_auth0,
                                            Url: this.jsonDataAuth0.url
                                        };



                                        var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/cUsersMaster');
                                        var settings = {
                                            "url": url,
                                            "method": "POST",
                                            "headers": {
                                                "Content-Type": "application/json"
                                            },
                                            "data": JSON.stringify({
                                                "input": jsonAdd
                                            })
                                        };

                                        $.ajax(settings).done(function (oDataRU) {
                                            this.setLogSystem("Creación", oDataRU.message, oDataRU.data).then(function () {
                                                element.status = 200;
                                                i++;
                                                avanceFinal++;
                                                functionCreateUserAuth0yHana(datosFunction, i);
                                            }.bind(this));
                                        }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                            //jqXHR.responseJSON.message
                                            //console.log(jqXHR);
                                            element.status = jqXHR.responseJSON.status;
                                            element.motivo = jqXHR.responseJSON.message;
                                            i++;
                                            avanceFinal++;
                                            functionCreateUserAuth0yHana(datosFunction, i);
                                        }.bind(this));

                                    }

                                }.bind(this);
                                functionCreateUserAuth0yHana(respuestaCargaMasivaUsuarios, 0);
                            } else {
                                this.cerrarDialogoCargaMasiva();
                                jQuery.sap.delayedCall(1500, this, function () {
                                    this.BusyDialogUserClose();
                                    this.dialogoInforme(respuestaCargaMasivaUsuarios);
                                }.bind(this));

                            }

                        }.bind(this));

                    }.bind(this));
            },
            // JB INICIO nueva función 
            //jsonAdd.VENDORS = [];
            cargaMasiva: function () {
                return new Promise(
                    function resolver(resolve, reject) {
                        this.totalUsuarios = dataCsv.length;
                        var datosCsv = {
                            dataCsv: dataCsv,
                            index: 0,
                            lengthDatos: dataCsv.length,
                            resolve: false,
                            datosValidados: [],
                            datosConErrores: []
                        };
                        var avanceFinal = 0;

                        this.cargaMasivaUsuarios(datosCsv).then(function (respuestaCargaMasivaUsuarios) {
                            if (respuestaCargaMasivaUsuarios.resolve) {

                                var functionCreateUserAuth0yHana = function (datosFunction, i) {
                                    var datosValidadosTotal = datosFunction.datosValidados.length;

                                    if (datosFunction.datosValidados.length === avanceFinal) {
                                        jQuery.sap.delayedCall(1000, this, function () {
                                            datosFunction.resolve = true;
                                            resolve(datosFunction);
                                        }.bind(this));

                                    } else {
                                        var numAvance = i + 1;
                                        sap.ui.getCore().byId("BusyIndicatorText").setText("Datos validados correctamente " + datosValidadosTotal +
                                            "... Procesando (" + numAvance + " de " + datosValidadosTotal + ")");

                                        var element = datosFunction.datosValidados[i];
                                        let tipoUsuario = this.getTipoUsuario(element.TIPO_USUARIO);

                                        // 1. Verificar que el proveedor existe
                                        this.verificarProveedor(element.CODIGO_PROVEEDOR).then(function (existeProveedor) {
                                            if (!existeProveedor) {
                                                element.status = 404;
                                                element.motivo = "El proveedor con código " + element.CODIGO_PROVEEDOR + " no existe";
                                                i++;
                                                avanceFinal++;
                                                functionCreateUserAuth0yHana(datosFunction, i);
                                                return;
                                            }

                                            // 2. Crear el usuario (sin proveedor)
                                            let jsonAdd = {};
                                            jsonAdd.USERID = null;
                                            jsonAdd.EMAIL = element.CORREO.trim();
                                            jsonAdd.FIRSTCHANGEPASS = 0;
                                            jsonAdd.DATEFIRSTCHANGEPASS = null;
                                            jsonAdd.USERTYPEID_USERTYPEID = tipoUsuario;
                                            jsonAdd.USERSTATUSID_USERSTATUSID = "10";
                                            jsonAdd.AUTH0ID = "";
                                            jsonAdd.VENDORS = [];
                                            jsonAdd.NAME_USER = element.NOMBRE_APELLIDO.trim();
                                            jsonAdd.paramAuth0 = {
                                                AccessToken: this.jsonDataAuth0.token_auth0,
                                                Url: this.jsonDataAuth0.url
                                            };

                                            var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/cUsersMaster');
                                            var settings = {
                                                "url": url,
                                                "method": "POST",
                                                "headers": {
                                                    "Content-Type": "application/json"
                                                },
                                                "data": JSON.stringify({
                                                    "input": jsonAdd
                                                })
                                            };

                                            $.ajax(settings).done(function (oDataRU) {
                                                // 3. Si se creó el usuario, asignar el proveedor
                                                var userId = oDataRU.data[0].USERID;

                                                this.asignarProveedorAUsuario(userId, element.CODIGO_PROVEEDOR).then(function (asignacionExitosa) {
                                                    if (asignacionExitosa) {
                                                        this.setLogSystem("Creación", oDataRU.message + " | Proveedor asignado", oDataRU.data).then(function () {
                                                            element.status = 200;
                                                            element.motivo = "Usuario creado y proveedor asignado correctamente";
                                                            i++;
                                                            avanceFinal++;
                                                            functionCreateUserAuth0yHana(datosFunction, i);
                                                        }.bind(this));
                                                    } else {
                                                        // Si falla la asignación pero el usuario se creó
                                                        this.setLogSystem("Creación", oDataRU.message + " | Error al asignar proveedor", oDataRU.data).then(function () {
                                                            element.status = 206; // Partial success
                                                            element.motivo = "Usuario creado pero no se pudo asignar el proveedor";
                                                            i++;
                                                            avanceFinal++;
                                                            functionCreateUserAuth0yHana(datosFunction, i);
                                                        }.bind(this));
                                                    }
                                                }.bind(this));

                                            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                                                element.status = jqXHR.responseJSON.status || 500;
                                                element.motivo = jqXHR.responseJSON.message || "Error al crear usuario";
                                                i++;
                                                avanceFinal++;
                                                functionCreateUserAuth0yHana(datosFunction, i);
                                            }.bind(this));
                                        }.bind(this));
                                    }
                                }.bind(this);
                                functionCreateUserAuth0yHana(respuestaCargaMasivaUsuarios, 0);
                            } else {
                                this.cerrarDialogoCargaMasiva();
                                jQuery.sap.delayedCall(1500, this, function () {
                                    this.BusyDialogUserClose();
                                    this.dialogoInforme(respuestaCargaMasivaUsuarios);
                                }.bind(this));
                            }
                        }.bind(this));
                    }.bind(this));
            },

            // Función mejorada para verificar proveedor
            verificarProveedor: function (codigoProveedor) {
                return new Promise(function (resolve) {
                    if (!codigoProveedor || codigoProveedor.trim() === "") {
                        resolve(false);
                        return;
                    }

                    // Asegurar que el código tenga 10 dígitos con ceros a la izquierda
                    let supplierCode = codigoProveedor.padStart(10, '0');

                    let oFilter = [
                        new Filter("Supplierblocked", "NE", 'X'),
                        new Filter("Supplier", "EQ", supplierCode)
                    ];

                    this.getView().getModel("modeloDatos").read("/vendorSet", {
                        filters: oFilter,
                        success: function (oData) {
                            resolve(oData.results.length > 0);
                        }.bind(this),
                        error: function (error) {
                            console.error("Error al verificar proveedor:", error);
                            resolve(false);
                        }.bind(this)
                    });
                }.bind(this));
            },

            // Función mejorada para asignar proveedor
            asignarProveedorAUsuario: function (userId, codigoProveedor) {
                return new Promise(function (resolve) {
                    if (!userId || !codigoProveedor) {
                        resolve(false);
                        return;
                    }

                    let supplierCode = codigoProveedor.padStart(10, '0');
                    let param = {
                        USERID: userId,
                        VENDORID: supplierCode,
                        FIRSTACCESS: 0,
                        DATEFIRSTACCESS: null,
                        DELETESTATUS: "1"
                    };

                    var url = this.getOwnerComponent().getManifestObject().resolveUri('../PORTAL_PROVEEDORES_REST/cUsersvendors');
                    var settings = {
                        "url": url,
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "data": JSON.stringify({
                            "input": param
                        })
                    };

                    $.ajax(settings).done(function (oDataRU) {
                        // Verificar si la asignación fue exitosa
                        if (oDataRU && oDataRU.code === 200) {
                            resolve(true);
                        } else {
                            console.error("Error en respuesta al asignar proveedor:", oDataRU.message);
                            resolve(false);
                        }
                    }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                        // Manejar específicamente el caso de proveedor ya asignado
                        if (jqXHR.responseJSON && jqXHR.responseJSON.code === 301) {
                            // Proveedor ya estaba asignado, lo consideramos como éxito
                            resolve(true);
                        } else {
                            console.error("Error al asignar proveedor:", jqXHR.responseJSON);
                            resolve(false);
                        }
                    }.bind(this));
                }.bind(this));
            },

            // JB FIN  nueva función   

            getTipoUsuario: function (value) {
                let retorno = "02";
                if (value.toUpperCase() === "ADMINISTRADOR") {
                    retorno = "01";
                } else if (value.toUpperCase() === "ASISTENTE") {
                    retorno = "03";
                }
                return retorno;
            },

            cargaMasivaUsuarios: function (data) {
                return new Promise(
                    function resolver(resolve) {
                        var functionCargaMasivaUsuarios = function (datos) {

                            sap.ui.getCore().byId("progressIndicatoirId").setDisplayValue(datos.index + " de " + datos.lengthDatos);
                            sap.ui.getCore().byId("progressIndicatoirId").setState("Success");
                            sap.ui.getCore().byId("progressIndicatoirId").setPercentValue(this.sumaAvance);
                            this.sumaAvance = this.sumaAvance + this.avance;
                            sap.ui.getCore().byId("BusyIndicatorText").setText("Validando el formato de los datos...");
                            if (datos.lengthDatos === datos.index) {
                                if (datos.datosValidados.length === 0) {
                                    datos.resolve = false;
                                    resolve(datos);
                                } else {
                                    datos.resolve = true;
                                    resolve(datos);
                                }
                            } else {
                                var i = datos.index;

                                this.validacionCorreo(datos.dataCsv[i]).then(function (respuestaValidacionCorreo) {
                                    if (respuestaValidacionCorreo) {
                                        this.validacionNombre(datos.dataCsv[i]).then(function (
                                            respuestaValidacionNombre) {
                                            if (respuestaValidacionNombre) {
                                                this.validacionTipoUsuario(datos.dataCsv[i]).then(function (
                                                    respuestavalidacionTipoUsuario) {
                                                    if (respuestavalidacionTipoUsuario) {
                                                        this.matchCorreoVendorECC(datos.dataCsv[i]).then(function (
                                                            respuestamatchCorreoVendorECC) {
                                                            //datos.dataCsv[i].motivo = "Usuario creado correctamente.";
                                                            datos.datosValidados.push(datos.dataCsv[i]);
                                                            datos.index++;
                                                            functionCargaMasivaUsuarios(datos);

                                                        }.bind(this));
                                                    } else {
                                                        datos.datosConErrores.push(datos.dataCsv[i]);
                                                        datos.index++;
                                                        functionCargaMasivaUsuarios(datos);
                                                    }
                                                }.bind(this));
                                            } else {
                                                datos.datosConErrores.push(datos.dataCsv[i]);
                                                datos.index++;
                                                functionCargaMasivaUsuarios(datos);
                                            }
                                        }.bind(this));
                                    } else {
                                        datos.datosConErrores.push(datos.dataCsv[i]);
                                        datos.index++;
                                        functionCargaMasivaUsuarios(datos);
                                    }
                                }.bind(this));
                            }
                        }.bind(this);
                        functionCargaMasivaUsuarios(data);
                    }.bind(this));
            },

            prepararCargaMasiva: function (arrCSV1, noOfCols1, hdrRow1) {
                return new Promise(
                    function resolver(resolve, reject) {

                        if (arrCSV1.length >= columnasCsv) {
                            var lengthFor = arrCSV1.length / columnasCsv;
                            var cien = 100;
                            this.avance = cien / lengthFor;
                            this.sumaAvance = 0;
                            var functionRows = function (arrCSV, noOfCols, hdrRow, i, lengthFor, pos) {
                                var obj = {};
                                var row = arrCSV.splice(pos, noOfCols);
                                if (row.length === columnasCsv) {
                                    var a = 0;
                                    var functionIntoRow = function (row, a) {
                                        if (row.length === a) {
                                            dataCsv.push(obj);
                                            i++;
                                            pos = 0;
                                            if (lengthFor === i) {
                                                resolve(true);
                                            } else {
                                                functionRows(arrCSV, noOfCols, hdrRow, i, lengthFor, pos);
                                            }
                                        } else {
                                            obj[hdrRow[a]] = row[a].trim();
                                            a++;
                                            functionIntoRow(row, a);
                                        }
                                    }.bind(this);
                                    functionIntoRow(row, 0);
                                } else {
                                    resolve(false);
                                }
                            };
                            functionRows(arrCSV1, noOfCols1, hdrRow1, 0, lengthFor, 0);
                        } else {
                            resolve(false);
                        }
                    }.bind(this));
            },

            descargarFormatoCargaMasiva: function () {
                var link = document.createElement("a");
                link.download = "cargaMasivaUsuariosPortal.csv";
                var path = jQuery.sap.getModulePath("com.claro.proveedores.adminusuarios");
                if (path === "..") {
                    path = "/";
                } else {
                    path += "/";
                }
                var doc = path + "csv/cargaMasivaUsuariosPortal.csv";
                link.href = doc;
                link.click();
            },

            validacionCorreo: function (datos) {
                return new Promise(
                    function resolver(resolve) {
                        var value = datos.CORREO;
                        if (value === null || value === undefined) {
                            datos.motivo = "Campo obligatorio, no puede ser vacío.";
                            resolve(false);
                        } else if (value.length < 1) {
                            datos.motivo = "Campo obligatorio, no puede ser vacío.";
                            resolve(false);
                        }
                        var re = /^([\da-z_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
                        if (!re.exec(value)) {
                            datos.motivo = "El formato del correo no es válido.";
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    }.bind(this));
            },

            validacionNombre: function (datos) {
                return new Promise(
                    function resolver(resolve) {
                        var value = datos.NOMBRE_APELLIDO;
                        if (value === null || value === undefined) {
                            datos.motivo = "Campo obligatorio, no puede ser vacío.";
                            resolve(false);
                        } else if (value.length < 1) {
                            datos.motivo = "Campo obligatorio, no puede ser vacío.";
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    }.bind(this));

            },

            validacionTipoUsuario: function (datos) {
                return new Promise(
                    function resolver(resolve) {
                        var value = datos.TIPO_USUARIO;
                        if (value === null || value === undefined) {
                            datos.motivo = "Campo obligatorio, no puede ser vacío.";
                            resolve(false);
                        } else if (value.length < 1) {
                            datos.motivo = "Campo obligatorio, no puede ser vacío.";
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    }.bind(this));
            },

            dialogoInforme: function (datos) {
                var modeloInformeCargaMasiva = new JSONModel([]);

                var that = this;
                var oBackButton;
                var oMessageTemplate = new sap.m.MessageItem({
                    type: '{modeloInformeCargaMasiva>type}',
                    title: '{modeloInformeCargaMasiva>title}',
                    //description: '{modeloInformeCargaMasiva>description}',
                    subtitle: '{modeloInformeCargaMasiva>subtitle}',
                    groupName: '{modeloInformeCargaMasiva>group}'
                });

                this.oMessageView = new sap.m.MessageView({
                    showDetailsPageHeader: false,
                    groupItems: true,
                    itemSelect: function () {
                        oBackButton.setVisible(true);
                    },
                    items: {
                        path: "modeloInformeCargaMasiva>/",
                        template: oMessageTemplate
                    }
                });
                oBackButton = new sap.m.Button({
                    icon: sap.ui.core.IconPool.getIconURI("nav-back"),
                    visible: false,
                    press: function () {
                        that.oMessageView.navigateBack();
                        this.setVisible(false);
                    }
                });

                this._oViewSettingsDialogInforme = new sap.m.Dialog({
                    resizable: false,
                    content: this.oMessageView,
                    state: 'Information',
                    beginButton: new sap.m.Button({
                        press: function () {
                            this._oViewSettingsDialogInforme.close();
                            this.oActualizarVista();
                        }.bind(this),
                        text: "Cerrar"
                    }),
                    customHeader: new sap.m.Bar({
                        contentMiddle: [
                            new sap.m.Text({
                                text: "Informe Carga Masiva"
                            })
                        ],
                        contentLeft: [oBackButton]
                    }),
                    contentHeight: "300px",
                    contentWidth: "600px",
                    verticalScrolling: false
                });

                for (var i = 0; i < datos.datosValidados.length; i++) {
                    var json_i = {
                        type: 'Success',
                        title: 'Usuario ' + datos.datosValidados[i].NOMBRE_APELLIDO + ' fue creado correctamente.',
                        description: "",
                        subtitle: "",
                        group: datos.datosValidados[i].TIPO_USUARIO
                    };

                    if (datos.datosValidados[i].status !== 200) {
                        json_i.type = 'Error';
                        json_i.title = 'No fue posible crear al usuario ' + datos.datosValidados[i].NOMBRE_APELLIDO + '.';
                        json_i.description = datos.datosValidados[i].motivo;
                        json_i.subtitle = 'Motivo: ' + datos.datosValidados[i].motivo;
                    }

                    modeloInformeCargaMasiva.getData().push(json_i);
                }

                for (var a = 0; a < datos.datosConErrores.length; a++) {
                    var json_a = {
                        type: 'Error',
                        title: 'No fue posible crear al usuario ' + datos.datosConErrores[a].NOMBRE_APELLIDO + '.',
                        description: datos.datosConErrores[a].motivo,
                        subtitle: 'Motivo: ' + datos.datosConErrores[a].motivo,
                        group: datos.datosConErrores[a].TIPO_USUARIO
                    };
                    modeloInformeCargaMasiva.getData().push(json_a);
                }
                this._oViewSettingsDialogInforme.setModel(modeloInformeCargaMasiva, "modeloInformeCargaMasiva");
                this._oViewSettingsDialogInforme.open();
                this._oViewSettingsDialogInforme.getModel("modeloInformeCargaMasiva").refresh();
                this.oMessageView.navigateBack();
            },

            cerrarDialogoInforme: function () {
                this._oViewSettingsDialogInforme.close();
                //this.oActualizarVista();
            },

            onChangeUploadFile: function (oEvent) {
                this.fileCsv = oEvent.getParameters().files;
            },

            setLogSystem: function (action, description, detail) {
                return new Promise(function (resolve) {
                    let mail = this.jsonDataUser.userMail;
                    let jsonData = {};

                    let uuid = self.crypto.randomUUID();
                    jsonData.ID = uuid; // Type="Edm.Guid" Nullable="false"/>
                    jsonData.creation_date = this.getDateTime(new Date()); // Type="Edm.DateTimeOffset"/>
                    jsonData.action = action; // Type="Edm.String" MaxLength="100"/>
                    jsonData.location = "Mantenedores"; // Type="Edm.String" MaxLength="50"/>
                    jsonData.description = description; // Type="Edm.String" MaxLength="999"/>
                    jsonData.creation_user = mail; // Type="Edm.String" MaxLength="255"/>
                    jsonData.app_description = "Administrador de usuarios"; // Type="Edm.String" MaxLength="999"/>
                    jsonData.detail = JSON.stringify(detail); // Type="Edm.String"/>
                    jsonData.deleteStatus = "1"; // Type="Edm.String" MaxLength="1"/>
                    this.getView().getModel("modeloDatosCAP").create('/SystemLog', jsonData, {
                        success: function (oResult) {
                            resolve();
                        }.bind(this),
                        error: function (oError) {
                            resolve();
                        }.bind(this)
                    });
                }.bind(this));
            },

            getDateTime: function (fecha) {
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    style: 'medium',
                    UTC: true,
                    pattern: 'yyyy-MM-dd'
                });
                var dateFormatted = dateFormat.format(fecha);
                var salida = dateFormatted + "T" + this.addZero(fecha.getHours()) + ":" + this.addZero(fecha.getMinutes());
                return salida;
            },

            addZero: function (sValue) {
                if (sValue < 10) {
                    sValue = "0" + sValue;
                }
                return sValue;
            },


        });
    });
