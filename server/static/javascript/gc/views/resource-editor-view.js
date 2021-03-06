
// FIXME TODO - must return errors to the user in an elegant way, both client side (here) and from the server

/*global define*/
define(["backbone", "underscore", "jquery", "gc/views/base-editor-view", "gc/views/global-resource-editor-view", "gc/views/resource-locations-view", "agfk/models/resource-location-model", "utils/utils"], function(Backbone, _, $, BaseEditorView, GlobalResourceEditorView, ResourceLocationsView, ResourceLocation, Utils){
  return  (function(){

    var pvt = {};
    pvt.consts = {
      templateId: "resource-editor-template",
      ecClass: "expanded",
      globalResClass: "global-resource-fields",
      resLocWrapperClass: "resource-location-wrapper",
      rgcClass: "resource-goals-covered",
      crfClass: "core-radio-field",
      sortableClass: "sortable"
    };

    return BaseEditorView.extend({
      template: _.template(document.getElementById(pvt.consts.templateId).innerHTML),
      tagName: "li",
      className: "resource-form input-form",
      events: function(){
        var oevts = BaseEditorView.prototype.events(),
            consts = pvt.consts;
        oevts["click .res-tabs button"] = "changeDispResSec";
        oevts["click .delete-res"] = "destroyModel";
        oevts["blur .deps-field"] = "changeDepsField";
        oevts["blur .array-text-field"] = "changeArrayTextField";
        oevts["change ." + consts.crfClass] = "changeCoreRadioField";
        oevts["change ." + consts.rgcClass + " input"] = "changeCoveredGoal";
        oevts["click #add-location-button"] = "addResourceLocation";
        return oevts;
      },

      /**
       * render the view and return the view element
       */
      render: function(){
        var thisView = this,
            consts = pvt.consts;
        thisView.isRendered = false;

        var assignObj = {};
        thisView.globalResourceView = thisView.globalResourceView || new GlobalResourceEditorView({model: thisView.model.get("global_resource")});
        thisView.globalResourceView.conceptModel = thisView.model;
        thisView.globalResourceView.parentView = thisView;
        thisView.resourceLocationsView = thisView.resourceLocationsView || new ResourceLocationsView({model: thisView.model.get("locations")});

        // make sure we have at least one resource location
        if (thisView.resourceLocationsView.model.length == 0){
          thisView.addResourceLocation();
        }

        assignObj["." + consts.globalResClass] = thisView.globalResourceView;
        assignObj["." + consts.resLocWrapperClass] = thisView.resourceLocationsView;

        thisView.model.grSelected = thisView.model.get("global_resource").get("title").length > 0;
        thisView.$el.html(thisView.template(thisView.model.attributes));

        // assign the subviews
        thisView.assign(assignObj);

        // set the active global/local button
        thisView.curResDisp = thisView.curResDisp || consts.globalResClass;
        thisView.$el.find("." + thisView.curResDisp).addClass("active");
        thisView.$el.find(".btn-" + thisView.curResDisp).addClass("active");

        thisView.isRendered = true;
        thisView.$el.find("." + consts.sortableClass).sortable().bind('sortupdate', function() {
          thisView.updateLocationOrdering();
        });
        return thisView;
      },

      /**
       * Update the resource location ordering to match the ordering in the list
       */
      updateLocationOrdering: function () {
        var thisView = this,
            locs = thisView.model.get("locations");

        thisView.$el.find("." + pvt.consts.resLocWrapperClass).find("li").each(function (i, liEl) {
          var locCid = liEl.id.split("-")[0],
              locObj = locs.get(locCid);
          if (locObj.get("ordering") !== i) {
            locObj.set("ordering", i);
            locObj.save({ordering: i}, {patch: true, parse: false});
          }
        });
        locs.sort();
      },

      addResourceLocation: function () {
        var thisView = this,
            rlid = Math.random().toString(36).substr(3, 11),
            resLoc = new ResourceLocation({id: rlid, cresource: thisView.model, ordering: _.max(thisView.model.get("locations").pluck("ordering")) + 1});
        thisView.resourceLocationsView = thisView.resourceLocationsView || new ResourceLocationsView({model: thisView.model.get("locations")});
        thisView.resourceLocationsView.model.add(resLoc);
        // verify the rl id is okay
        // TODO fix hardcoded URLS!
        $.get(window.agfkGlobals.idcheckUrl,
          {id: rlid, type: "resource_location" })
          .success(function (resp) {
            resLoc.set("id", resp.id);
        })
          .fail(function (resp){
            Utils.errorNotify("unable to sync resource id with the server: " + resp.responseText);
          });
          thisView.render();
      },

      /**
       * Changed the displayed resource section
       */
      changeDispResSec: function (evt) {
        var thisView = this,
            classesStr = evt.currentTarget.className,
            val = classesStr.split(" ")[0].substr(4);
        if (thisView.curResDisp !== val ) {
          thisView.curResDisp = val;
          thisView.render();
        }
      },

      /**
       * changeDepsField: change dependency field in the resource model
       * -- array of titles
       */
      changeDepsField: function (evt) {
        var thisView = this,
            curTar = evt.currentTarget,
            attrName = curTar.name.split("-")[0],
            inpText = curTar.value,
            saveObj = {};

        // parse tags server side since graph is being created
        saveObj[attrName] = inpText.split(/\s*,\s*/).map(function (title) {
          return {title: title};
        });
        thisView.model.save(saveObj, {parse: false, patch: true});
      },

      /**
       * changeCoveredGoal: change which goals are covered by the resource
       */
      changeCoveredGoal: function (evt) {
        var thisView = this,
            checkbox = evt.currentTarget,
            goalId = checkbox.value,
            checked = checkbox.checked,
            goalsCovered = this.model.get("goals_covered"),
            gidIndex = goalsCovered.indexOf(goalId),
            saveObj = {};

        if (checked && gidIndex === -1) {
          goalsCovered.push(goalId);
        } else if (!checked && gidIndex !== -1) {
          goalsCovered.splice(gidIndex, 1);
        }
        thisView.model.set("goals_covered", goalsCovered);
        thisView.model.save(null, {parse: false});
      },

      /**
       * Change to array text field -- separate entries with newline
       */
      changeArrayTextField: function (evt) {
        var thisView = this,
            curTar = evt.currentTarget,
            saveVals = curTar.value.split("\n"),
            saveObj = {},
            attrName = curTar.name.split("-")[0];

        if (thisView.model.get(attrName) !== saveVals) {
          saveObj[attrName] = saveVals;
          thisView.model.save(saveObj, {parse: false, patch: !thisView.model.doSaveUpdate});
        }
      },

      /**
       * changeCoreRadioField: change core/supplementary field in the resource model
       */
      changeCoreRadioField: function (evt) {
        var thisView = this,
            curTar = evt.currentTarget,
            attrName = curTar.name.split("-")[0],
            coreVal = curTar.value === "core" ? 1 : 0,
            $rgc = $(evt.currentTarget.parentElement).find("." + pvt.consts.rgcClass).hide(),
            saveObj = {};
        saveObj[attrName] = coreVal;
        thisView.model.save(saveObj, {parse: false, patch: true});
        if (coreVal) {
          $rgc.hide();
        } else {
          $rgc.show();
        }
      }
    });
  })();
});
