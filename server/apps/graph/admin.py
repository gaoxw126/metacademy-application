from django import forms
from django.contrib import admin
from models import Concept, Tag
from django.utils.translation import ugettext_lazy as _
from django.contrib.admin.widgets import FilteredSelectMultiple

from apps.roadmaps.models import Roadmap

class ConceptAdmin(admin.ModelAdmin):
    list_display = ('title', 'tag', 'is_provisional', 'last_mod', 'get_concept_graph_ids', 'get_edit_usernames')
    filter_horizontal = ("tags",)
    
admin.site.register(Concept, ConceptAdmin)


class TagAdminForm(forms.ModelForm):
  concepts = forms.ModelMultipleChoiceField(
    queryset=Concept.objects.all(), 
    required=False,
    widget=FilteredSelectMultiple(
      verbose_name=_('concepts'),
      is_stacked=False
    )
  )

  roadmaps = forms.ModelMultipleChoiceField(
    queryset=Roadmap.objects.all(),
    required=False,
    widget=FilteredSelectMultiple(
      verbose_name=_('roadmaps'),
      is_stacked=False
    )
  )

  class Meta:
    model = Tag

  def __init__(self, *args, **kwargs):
    super(TagAdminForm, self).__init__(*args, **kwargs)

    if self.instance and self.instance.pk:
      self.fields['concepts'].initial = self.instance.concepts.all()
      self.fields['roadmaps'].initial = self.instance.roadmaps.all()

  def save(self, commit=True):
    tag = super(TagAdminForm, self).save(commit=False)
    tag.save()

    if tag.pk:
      try:
        tag.concepts = self.cleaned_data['concepts']
        tag.roadmaps = self.cleaned_data['roadmaps']
        self.save_m2m()
      except ValueError:
        pass

    return tag

class TagAdmin(admin.ModelAdmin):
  form = TagAdminForm

admin.site.register(Tag, TagAdmin)
