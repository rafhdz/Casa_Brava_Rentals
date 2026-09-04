"""
Prestadores externos de servicios.

Hoy solo hay masajistas (`spa_masseuses` en Supabase). La app existe como
módulo propio —en vez de dejar el catálogo dentro de `servicios`— porque un
proveedor es una entidad con identidad propia y ciclo de vida independiente del
servicio que presta: se da de alta, se suspende (`status`) y puede acumular
agenda sin que eso toque el catálogo de servicios que se le ofrece al huésped.
Chefs, sommeliers u otros externos entran aquí cuando se agreguen.
"""

import uuid

from django.db import models

from usuarios.models import ProfileStatus


class SpaMasseuse(models.Model):
    """Masajista disponible para el servicio de spa."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    status = models.CharField(
        max_length=10, choices=ProfileStatus.choices, default=ProfileStatus.ACTIVO
    )

    class Meta:
        db_table = "spa_masseuses"
        verbose_name = "masajista"
        verbose_name_plural = "masajistas"
        ordering = ["name"]

    def __str__(self):
        return self.name
