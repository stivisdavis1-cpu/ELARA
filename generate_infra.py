import os

services = ["api-nest", "api-ai", "web"]
envs = ["dev", "staging", "production", "onpremise"]
base_path = "d:/ELARA/infra/k8s"

for svc in services:
    svc_path = os.path.join(base_path, svc)
    os.makedirs(os.path.join(svc_path, "templates"), exist_ok=True)
    
    with open(os.path.join(svc_path, "Chart.yaml"), "w") as f:
        f.write(f"apiVersion: v2\nname: {svc}\ndescription: A Helm chart for ELARA {svc}\nversion: 0.1.0\nappVersion: 1.16.0\n")
    
    with open(os.path.join(svc_path, "templates", "deployment.yaml"), "w") as f:
        f.write(f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{{{ .Release.Name }}}}-{svc}
spec:
  replicas: {{{{ .Values.replicaCount }}}}
  selector:
    matchLabels:
      app: {svc}
  template:
    metadata:
      labels:
        app: {svc}
    spec:
      containers:
        - name: {svc}
          image: "{{{{ .Values.image.repository }}}}:{{{{ .Values.image.tag }}}}"
          ports:
            - containerPort: {{{{ .Values.service.port }}}}
          envFrom:
            - configMapRef:
                name: {{{{ .Release.Name }}}}-{svc}-config
""")

    with open(os.path.join(svc_path, "templates", "service.yaml"), "w") as f:
        f.write(f"""apiVersion: v1
kind: Service
metadata:
  name: {{{{ .Release.Name }}}}-{svc}
spec:
  type: ClusterIP
  ports:
    - port: {{{{ .Values.service.port }}}}
      targetPort: {{{{ .Values.service.port }}}}
  selector:
    app: {svc}
""")

    with open(os.path.join(svc_path, "templates", "configmap.yaml"), "w") as f:
        f.write(f"""apiVersion: v1
kind: ConfigMap
metadata:
  name: {{{{ .Release.Name }}}}-{svc}-config
data:
{{{{- range $key, $val := .Values.env }}}}
  {{{{ $key }}}}: {{{{ $val | quote }}}}
{{{{- end }}}}
""")

    with open(os.path.join(svc_path, "templates", "hpa.yaml"), "w") as f:
        f.write(f"""apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{{{ .Release.Name }}}}-{svc}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{{{ .Release.Name }}}}-{svc}
  minReplicas: {{{{ .Values.autoscaling.minReplicas }}}}
  maxReplicas: {{{{ .Values.autoscaling.maxReplicas }}}}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{{{ .Values.autoscaling.targetCPUUtilizationPercentage }}}}
""")
    for env in envs:
        with open(os.path.join(svc_path, f"values-{env}.yaml"), "w") as f:
            f.write(f"""replicaCount: 1
image:
  repository: elara/{svc}
  tag: latest
service:
  port: 80
autoscaling:
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 80
env:
  ENVIRONMENT: {env}
""")

# Octopus Deploy files
octopus_path = "d:/ELARA/infra/octopus"
os.makedirs(octopus_path, exist_ok=True)
for svc in services:
    with open(os.path.join(octopus_path, f"deploy-{svc}.yaml"), "w") as f:
        f.write(f"""steps:
  - name: Deploy {svc} via Helm
    action: Octopus.HelmChartUpgrade
    properties:
      Octopus.Action.Helm.ChartDirectory: infra/k8s/{svc}
      Octopus.Action.Helm.ReleaseName: elara-{svc}
      Octopus.Action.Helm.AdditionalArgs: "-f infra/k8s/{svc}/values-#{{Octopus.Environment.Name | ToLower}}.yaml"
""")
