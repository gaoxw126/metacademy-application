from django.conf.urls import patterns, include, url
# handle static files locally
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.contrib import admin
from django.views.decorators.cache import cache_page
from django.views.generic.base import TemplateView, RedirectView

from views import SearchView

admin.autodiscover()

"""
Django urls handler
"""
urlpatterns = patterns('',
                       url(r'^$', TemplateView.as_view(template_name="landing.html")),
                       url(r'^(?i)search$', SearchView.as_view()),
                       url(r'^(?i)list$', TemplateView.as_view(template_name="concept-list.html")),
                       url(r'^(?i)concepts/((?P<anything>.*))', RedirectView.as_view(url="/graphs/concepts/%(anything)s", query_string=True), name='concepts'),
                       url(r'^(?i)graphs/', include('apps.graph.urls', namespace="graphs") ),
                       url(r'^user/', include('apps.user_management.urls', namespace='user') ),
                       url(r'^roadmaps/', include('apps.roadmaps.urls', namespace='roadmaps')),
                       # url(r'^dev/benchmarktest', benchmark_viewer),
                       url(r'^captcha/', include('captcha.urls')),
                       url(r'^about/?$',  TemplateView.as_view(template_name='about.html')),
                       url(r'^contribute/?$',  TemplateView.as_view(template_name='contribute.html')),
                       url(r'^admin/', include(admin.site.urls)),
                       url(r'^happy/', include('lazysignup.urls')),
)

urlpatterns += staticfiles_urlpatterns()
