package drift

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/swamizero/gitops-controller/internal/models"
)

// resource templates for generating realistic drift
var resourceKinds = []string{"Deployment", "Service", "Route", "ConfigMap", "Secret", "HorizontalPodAutoscaler", "ServiceAccount", "NetworkPolicy"}

var fieldDrifts = map[string][]struct {
	Field    string
	Desired  string
	Live     string
	Severity models.DriftSeverity
}{
	"Deployment": {
		{Field: "spec.replicas", Desired: "3", Live: "1", Severity: models.DriftSeverityHigh},
		{Field: "spec.template.spec.containers[0].image", Desired: "registry.acme.io/app:v2.1.0", Live: "registry.acme.io/app:v1.9.3", Severity: models.DriftSeverityHigh},
		{Field: "spec.template.spec.containers[0].resources.limits.memory", Desired: "512Mi", Live: "256Mi", Severity: models.DriftSeverityMedium},
		{Field: "spec.template.spec.containers[0].env[DB_POOL_SIZE]", Desired: "25", Live: "10", Severity: models.DriftSeverityMedium},
		{Field: "spec.strategy.rollingUpdate.maxSurge", Desired: "25%", Live: "50%", Severity: models.DriftSeverityLow},
	},
	"Service": {
		{Field: "spec.ports[0].targetPort", Desired: "8080", Live: "3000", Severity: models.DriftSeverityHigh},
		{Field: "metadata.annotations[service.beta.kubernetes.io/load-balancer-type]", Desired: "nlb", Live: "clb", Severity: models.DriftSeverityMedium},
	},
	"Route": {
		{Field: "spec.tls.termination", Desired: "edge", Live: "passthrough", Severity: models.DriftSeverityMedium},
		{Field: "spec.host", Desired: "api.acme.io", Live: "api-old.acme.io", Severity: models.DriftSeverityHigh},
	},
	"ConfigMap": {
		{Field: "data.LOG_LEVEL", Desired: "info", Live: "debug", Severity: models.DriftSeverityLow},
		{Field: "data.FEATURE_FLAG_NEW_UI", Desired: "true", Live: "false", Severity: models.DriftSeverityLow},
		{Field: "data.DB_HOST", Desired: "db-primary.internal", Live: "db-replica.internal", Severity: models.DriftSeverityHigh},
	},
	"Secret": {
		{Field: "data.API_KEY", Desired: "(rotated)", Live: "(stale)", Severity: models.DriftSeverityHigh},
	},
	"HorizontalPodAutoscaler": {
		{Field: "spec.maxReplicas", Desired: "10", Live: "5", Severity: models.DriftSeverityMedium},
		{Field: "spec.metrics[0].resource.target.averageUtilization", Desired: "70", Live: "85", Severity: models.DriftSeverityLow},
	},
	"ServiceAccount": {
		{Field: "metadata.annotations[eks.amazonaws.com/role-arn]", Desired: "arn:aws:iam::role/v2", Live: "arn:aws:iam::role/v1", Severity: models.DriftSeverityMedium},
	},
	"NetworkPolicy": {
		{Field: "spec.ingress[0].from[0].namespaceSelector", Desired: "{matchLabels: env=prod}", Live: "{}", Severity: models.DriftSeverityHigh},
	},
}

var triageStepsByKind = map[string][]string{
	"Deployment": {
		"Check if manual kubectl edit or oc edit was used on the deployment",
		"Verify image tag matches the Git-tracked manifest",
		"Compare resource limits with capacity planning docs",
		"Run: oc diff -f <desired-manifest> to see full diff",
	},
	"ConfigMap": {
		"Check if config was edited directly via oc edit configmap",
		"Verify environment-specific overlays are correctly applied",
		"Compare with values in the Git repository",
	},
	"Secret": {
		"Check secret rotation schedule — stale secret may indicate missed rotation",
		"Verify sealed-secrets or external-secrets operator is functioning",
		"Do NOT print secret values — compare hashes only",
	},
	"Route": {
		"Verify Route host matches DNS records",
		"Check TLS termination policy against security requirements",
	},
}

// ComputeDrift generates a simulated drift report for an app environment
func ComputeDrift(app *models.App, envName string) *models.DriftReport {
	var env *models.Environment
	for i := range app.Environments {
		if app.Environments[i].Name == envName {
			env = &app.Environments[i]
			break
		}
	}
	if env == nil {
		return &models.DriftReport{
			AppID:       app.ID,
			Environment: envName,
			Severity:    models.DriftSeverityNone,
			Summary:     "Environment not found",
			LastChecked: time.Now(),
		}
	}

	if env.DriftSeverity == models.DriftSeverityNone || env.DriftCount == 0 {
		return &models.DriftReport{
			AppID:         app.ID,
			Environment:   envName,
			Severity:      models.DriftSeverityNone,
			ResourceCount: 0,
			Resources:     []models.DriftResource{},
			Summary:       fmt.Sprintf("No drift detected. Desired revision %s matches live state.", env.DesiredRevision),
			TriageSteps:   []string{},
			LastChecked:   time.Now(),
		}
	}

	// Generate realistic drifted resources
	rng := rand.New(rand.NewSource(hashString(app.ID + envName)))
	resources := generateDriftResources(rng, app.Name, env)

	// Collect triage steps
	triageSteps := collectTriageSteps(resources)

	severity := env.DriftSeverity
	summary := fmt.Sprintf(
		"%d resources drifted between desired revision %s and live revision %s. "+
			"Severity: %s. Primary issues: configuration and image mismatches in namespace %s.",
		len(resources), env.DesiredRevision, env.LiveRevision, severity, env.Namespace,
	)

	return &models.DriftReport{
		AppID:         app.ID,
		Environment:   envName,
		Severity:      severity,
		ResourceCount: len(resources),
		Resources:     resources,
		Summary:       summary,
		TriageSteps:   triageSteps,
		LastChecked:   time.Now(),
	}
}

func generateDriftResources(rng *rand.Rand, appName string, env *models.Environment) []models.DriftResource {
	count := env.DriftCount
	if count > 15 {
		count = 15
	}

	var resources []models.DriftResource
	usedKeys := make(map[string]bool)

	for len(resources) < count {
		kind := resourceKinds[rng.Intn(len(resourceKinds))]
		drifts, ok := fieldDrifts[kind]
		if !ok {
			continue
		}
		d := drifts[rng.Intn(len(drifts))]
		key := kind + "/" + d.Field
		if usedKeys[key] {
			continue
		}
		usedKeys[key] = true

		name := fmt.Sprintf("%s-%s", appName, kind)
		if kind == "Deployment" || kind == "Service" {
			name = appName
		}

		resources = append(resources, models.DriftResource{
			Kind:       kind,
			Name:       name,
			Namespace:  env.Namespace,
			Field:      d.Field,
			DesiredVal: d.Desired,
			LiveVal:    d.Live,
			Severity:   d.Severity,
		})
	}

	return resources
}

func collectTriageSteps(resources []models.DriftResource) []string {
	seen := make(map[string]bool)
	var steps []string
	for _, r := range resources {
		if kindSteps, ok := triageStepsByKind[r.Kind]; ok && !seen[r.Kind] {
			seen[r.Kind] = true
			steps = append(steps, kindSteps...)
		}
	}
	if len(steps) == 0 {
		steps = []string{
			"Run: oc diff against desired manifests to see full resource diff",
			"Check recent oc edit / kubectl apply commands in the namespace",
			"Review Argo CD sync history for partial syncs",
		}
	}
	return steps
}

func hashString(s string) int64 {
	var h int64
	for _, c := range s {
		h = h*31 + int64(c)
	}
	if h < 0 {
		h = -h
	}
	return h
}
